<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Transfers ownership of all content created by seed users (is_seed=true)
 * to a single target user. After transfer, the seed users no longer own
 * anything and can be deleted manually if desired.
 *
 * Use case: clean up dummy/seed accounts before real launch while keeping
 * the content visible under the operator's own account.
 *
 * SAFETY: Defaults to --dry-run. Production run requires --confirm.
 *
 * Transferred relationships:
 *   - posts.author_id           → target user
 *   - communities.owner_id      → target user
 *   - community_members.user_id → target user (deduped where conflict)
 *   - follows.follower_id       → target user (deduped)
 *   - follows.following_id      → target user (deduped)
 *   - bookmarks.user_id         → target user (deduped)
 *   - reposts.user_id           → target user (deduped)
 *   - likes.user_id             → target user (deduped)
 *   - comments.user_id          → target user (kept; comments can stack)
 *
 * Note: Tier/role of the target user are NOT changed. is_seed flag of seed
 * users stays true so you can identify them for later deletion.
 */
class TransferSeedDataToUser extends Command
{
    protected $signature = 'seeds:transfer-to-user
        {username : Username of the target user (e.g. lenny)}
        {--confirm : Actually run (default is dry-run)}';

    protected $description = 'Übertragt alle Inhalte von is_seed=true Usern an einen Ziel-User.';

    public function handle(): int
    {
        $dryRun = !$this->option('confirm');
        $targetUsername = (string) $this->argument('username');

        $target = User::whereRaw('LOWER(username) = ?', [mb_strtolower($targetUsername)])->first();
        if (!$target) {
            $this->error("Ziel-User '@{$targetUsername}' nicht gefunden.");
            return self::FAILURE;
        }

        $seedUsers = User::where('is_seed', true)
            ->where('id', '!=', $target->id)
            ->get(['id', 'username']);

        if ($seedUsers->isEmpty()) {
            $this->info('Keine Seed-User gefunden. Nichts zu tun.');
            return self::SUCCESS;
        }

        $seedIds = $seedUsers->pluck('id')->all();

        $this->info(sprintf(
            '%s — Ziel: @%s (id=%s) · %d Seed-User',
            $dryRun ? 'DRY-RUN' : 'PRODUCTION RUN',
            $target->username,
            substr($target->id, 0, 8),
            $seedUsers->count(),
        ));
        $this->newLine();

        $counts = $this->summary($seedIds, $target->id);
        foreach ($counts as $label => $count) {
            $this->line(sprintf('  %s: %d', str_pad($label, 28), $count));
        }
        $this->newLine();

        if ($dryRun) {
            $this->warn('DRY-RUN beendet. Mit --confirm tatsächlich ausführen.');
            return self::SUCCESS;
        }

        DB::transaction(function () use ($seedIds, $target) {
            // Posts: einfach übertragen, keine Konflikte erwartet.
            DB::table('posts')->whereIn('author_id', $seedIds)
                ->update(['author_id' => $target->id]);

            // Communities: ownership → target. member_count bleibt unverändert.
            DB::table('communities')->whereIn('owner_id', $seedIds)
                ->update(['owner_id' => $target->id]);

            // Community-Memberships: dedupliziert (target ist evtl. schon Mitglied).
            $existingMemberships = DB::table('community_members')
                ->where('user_id', $target->id)
                ->pluck('community_id')
                ->all();
            $existingSet = array_flip($existingMemberships);
            DB::table('community_members')->whereIn('user_id', $seedIds)
                ->where(function ($q) use ($existingSet) {
                    $q->whereNotIn('community_id', array_keys($existingSet));
                })
                ->update(['user_id' => $target->id]);
            // Reste löschen (waren Duplikate)
            DB::table('community_members')->whereIn('user_id', $seedIds)->delete();

            // Follows: dedupliziert für follower_id + following_id.
            $this->mergeFollowsColumn('follower_id', $seedIds, $target->id);
            $this->mergeFollowsColumn('following_id', $seedIds, $target->id);
            // Selbst-Follows (target → target) löschen.
            DB::table('follows')
                ->where('follower_id', $target->id)
                ->where('following_id', $target->id)
                ->delete();

            // Bookmarks: dedupe per (user_id, post_id).
            $this->mergeUserContentLink('bookmarks', 'post_id', $seedIds, $target->id);

            // Reposts: dedupe per (user_id, original_post_id).
            $this->mergeUserContentLink('reposts', 'original_post_id', $seedIds, $target->id);

            // Likes: dedupe per (user_id, post_id).
            $this->mergeUserContentLink('likes', 'post_id', $seedIds, $target->id);

            // Comments: einfach übertragen — Kommentare können stapeln.
            DB::table('comments')->whereIn('user_id', $seedIds)
                ->update(['user_id' => $target->id]);
        });

        $this->info('Transfer abgeschlossen.');
        $this->newLine();
        $this->warn(sprintf(
            'Die %d Seed-User existieren noch (is_seed=true). Du kannst sie über die DB löschen, '
                . 'sobald du sicher bist, dass nichts mehr referenziert wird.',
            $seedUsers->count(),
        ));

        return self::SUCCESS;
    }

    /** @return array<string, int> */
    private function summary(array $seedIds, string $targetId): array
    {
        $tables = [
            'posts (author_id)'            => ['posts', 'author_id'],
            'communities (owner_id)'       => ['communities', 'owner_id'],
            'community_members (user_id)'  => ['community_members', 'user_id'],
            'follows.follower_id'          => ['follows', 'follower_id'],
            'follows.following_id'         => ['follows', 'following_id'],
            'bookmarks (user_id)'          => ['bookmarks', 'user_id'],
            'reposts (user_id)'            => ['reposts', 'user_id'],
            'likes (user_id)'              => ['likes', 'user_id'],
            'comments (user_id)'           => ['comments', 'user_id'],
        ];
        $out = [];
        foreach ($tables as $label => [$table, $col]) {
            $out[$label] = (int) DB::table($table)->whereIn($col, $seedIds)->count();
        }
        return $out;
    }

    private function mergeFollowsColumn(string $column, array $seedIds, string $targetId): void
    {
        // For each follow row owned by a seed user, check if the (target, otherEnd) pair
        // already exists — if not, update; if yes, delete the seed row.
        $otherCol = $column === 'follower_id' ? 'following_id' : 'follower_id';
        $rows = DB::table('follows')->whereIn($column, $seedIds)->get();
        foreach ($rows as $row) {
            $exists = DB::table('follows')
                ->where($column, $targetId)
                ->where($otherCol, $row->$otherCol)
                ->exists();
            if ($exists) {
                DB::table('follows')->where('id', $row->id)->delete();
            } else {
                DB::table('follows')->where('id', $row->id)->update([$column => $targetId]);
            }
        }
    }

    private function mergeUserContentLink(string $table, string $otherCol, array $seedIds, string $targetId): void
    {
        $rows = DB::table($table)->whereIn('user_id', $seedIds)->get();
        foreach ($rows as $row) {
            $exists = DB::table($table)
                ->where('user_id', $targetId)
                ->where($otherCol, $row->$otherCol)
                ->exists();
            if ($exists) {
                DB::table($table)->where('id', $row->id)->delete();
            } else {
                DB::table($table)->where('id', $row->id)->update(['user_id' => $targetId]);
            }
        }
    }
}
