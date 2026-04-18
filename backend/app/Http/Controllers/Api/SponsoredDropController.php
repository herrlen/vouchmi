<?php
// app/Http/Controllers/Api/SponsoredDropController.php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SponsoredDrop;
use App\Services\LiveActivityPushService;
use App\Services\ReviveAdService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SponsoredDropController extends Controller
{
    public function __construct(
        private ReviveAdService $revive,
        private LiveActivityPushService $liveActivity,
    ) {}

    public function index(string $communityId): JsonResponse
    {
        $drops = SponsoredDrop::where('community_id', $communityId)
            ->whereIn('status', ['pending', 'approved', 'active'])
            ->latest()
            ->get();

        return response()->json(['drops' => $drops]);
    }

    public function vote(string $dropId, Request $request): JsonResponse
    {
        $data = $request->validate(['vote' => 'required|boolean']);
        $drop = SponsoredDrop::findOrFail($dropId);

        // Prüfe ob User schon gevotet hat
        $existing = DB::table('hive_drop_votes')
            ->where('drop_id', $dropId)
            ->where('user_id', $request->user()->id)
            ->first();

        if ($existing) {
            return response()->json(['message' => 'Du hast bereits abgestimmt'], 409);
        }

        DB::table('hive_drop_votes')->insert([
            'drop_id' => $dropId,
            'user_id' => $request->user()->id,
            'vote' => $data['vote'],
            'voted_at' => now(),
        ]);

        $data['vote']
            ? $drop->increment('votes_yes')
            : $drop->increment('votes_no');

        // Auto-approve bei >70% Ja-Stimmen und min. 5 Votes
        $fresh = $drop->fresh();
        $totalVotes = $fresh->votes_yes + $fresh->votes_no;
        if ($totalVotes >= 5 && $fresh->votes_yes / $totalVotes > 0.7 && $fresh->status === 'pending') {
            $fresh->update(['status' => 'approved']);

            // Revive Kampagne aktivieren
            try {
                $campaignId = $this->revive->createCampaign($fresh->toArray());
                $fresh->update(['revive_campaign_id' => $campaignId, 'status' => 'active']);
            } catch (\Exception $e) {
                logger()->error('Revive campaign creation failed', ['error' => $e->getMessage()]);
            }
        }

        return response()->json([
            'votes_yes' => $fresh->votes_yes,
            'votes_no' => $fresh->votes_no,
            'status' => $fresh->status,
        ]);
    }

    /**
     * Brand starts a drop — sets status to active and notifies followers.
     */
    public function startDrop(string $id, Request $request): JsonResponse
    {
        $drop = SponsoredDrop::findOrFail($id);
        $brand = $drop->brand;
        if (!$brand || $brand->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Nicht berechtigt.'], 403);
        }

        $data = $request->validate([
            'duration_minutes' => 'required|integer|min:5|max:1440',
            'original_price' => 'nullable|numeric|min:0',
            'drop_price' => 'nullable|numeric|min:0',
            'stock_limit' => 'nullable|integer|min:1',
        ]);

        $drop->update([
            'status' => 'active',
            'starts_at' => now(),
            'expires_at' => now()->addMinutes($data['duration_minutes']),
            'original_price' => $data['original_price'] ?? null,
            'drop_price' => $data['drop_price'] ?? null,
            'stock_limit' => $data['stock_limit'] ?? null,
            'stock_claimed' => 0,
            'participant_count' => 0,
        ]);

        return response()->json([
            'drop' => $drop->fresh(),
            'message' => 'Drop gestartet!',
        ]);
    }

    /**
     * Brand ends a drop early.
     */
    public function endDrop(string $id, Request $request): JsonResponse
    {
        $drop = SponsoredDrop::findOrFail($id);
        $brand = $drop->brand;
        if (!$brand || $brand->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Nicht berechtigt.'], 403);
        }

        $drop->update(['status' => 'ended', 'expires_at' => now()]);

        $contentState = $this->liveActivity->buildContentState(
            $drop->participant_count,
            $drop->stock_claimed,
            $drop->stock_limit,
            'ended'
        );
        $this->liveActivity->pushUpdate($drop->id, $contentState, true);

        return response()->json(['message' => 'Drop beendet.']);
    }

    /**
     * User registers their Live Activity push token for a drop.
     */
    public function registerActivityToken(string $id, Request $request): JsonResponse
    {
        $data = $request->validate(['push_token' => 'required|string|max:512']);

        DB::table('live_activity_tokens')->updateOrInsert(
            ['user_id' => $request->user()->id, 'drop_id' => $id],
            [
                'id' => Str::uuid()->toString(),
                'push_token' => $data['push_token'],
                'created_at' => now(),
            ]
        );

        SponsoredDrop::where('id', $id)->increment('participant_count');

        return response()->json(['registered' => true]);
    }
}
