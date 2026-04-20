<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Faker\Factory as Faker;

class VouchmiSeedSeeder extends Seeder
{
    // Fixed UUIDs for demo accounts
    private const USER_DEMO    = '00000000-0000-0000-0000-000000000001';
    private const INFLUENCER   = '00000000-0000-0000-0000-000000000002';
    private const BRAND_DEMO   = '00000000-0000-0000-0000-000000000003';
    private const PASSWORD     = 'VouchmiReview2026!';

    // Fixed community UUIDs
    private const COMMUNITIES = [
        '10000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000003',
        '10000000-0000-0000-0000-000000000004',
        '10000000-0000-0000-0000-000000000005',
        '10000000-0000-0000-0000-000000000006',
        '10000000-0000-0000-0000-000000000007',
        '10000000-0000-0000-0000-000000000008',
    ];

    private array $allUserIds = [];
    private array $communityMembers = []; // communityId => [userIds]

    public function run(): void
    {
        if (app()->environment('production')) {
            throw new \RuntimeException('Refusing to seed production database.');
        }

        $faker = Faker::create('de_DE');
        $faker->seed(12345);

        $this->cleanup();
        $this->seedUsers($faker);
        $this->seedCommunities();
        $this->seedMemberships($faker);
        $this->seedPosts($faker);
        $this->seedEngagement($faker);
        $this->seedFollows($faker);
        $this->seedDrops();
    }

    private function cleanup(): void
    {
        $seedIds = DB::table('users')->where('is_seed', true)->pluck('id');
        if ($seedIds->isEmpty()) return;

        DB::table('bookmarks')->whereIn('user_id', $seedIds)->delete();
        DB::table('likes')->whereIn('user_id', $seedIds)->delete();
        DB::table('comments')->whereIn('author_id', $seedIds)->delete();
        DB::table('follows')->where(fn ($q) => $q->whereIn('follower_id', $seedIds)->orWhereIn('following_id', $seedIds))->delete();
        DB::table('community_members')->whereIn('user_id', $seedIds)->delete();
        DB::table('posts')->whereIn('author_id', $seedIds)->delete();

        $brandIds = DB::table('brand_profiles')->whereIn('user_id', $seedIds)->pluck('id');
        if ($brandIds->isNotEmpty()) {
            DB::table('sponsored_drops')->whereIn('brand_id', $brandIds)->delete();
            DB::table('brand_profiles')->whereIn('id', $brandIds)->delete();
        }

        $commIds = collect(self::COMMUNITIES);
        DB::table('community_members')->whereIn('community_id', $commIds)->delete();
        DB::table('posts')->whereIn('community_id', $commIds)->delete();
        DB::table('communities')->whereIn('id', $commIds)->delete();

        DB::table('users')->whereIn('id', $seedIds)->delete();
    }

    private function seedUsers($faker): void
    {
        $now = now();
        $hash = Hash::make(self::PASSWORD);

        // 3 Demo accounts
        $demos = [
            ['id' => self::USER_DEMO, 'email' => 'review@vouchmi.com', 'username' => 'lena_m', 'display_name' => 'Lena Müller', 'role' => 'user', 'bio' => 'Interior-Liebhaberin aus Köln. Sammle schöne Dinge für Zuhause.'],
            ['id' => self::INFLUENCER, 'email' => 'influencer-demo@vouchmi.com', 'username' => 'max_w', 'display_name' => 'Max Wagner', 'role' => 'influencer', 'bio' => 'Tech-Reviewer & Gadget-Nerd. Empfehlungen aus dem echten Alltag.', 'phone' => '+491701234567'],
            ['id' => self::BRAND_DEMO, 'email' => 'brand-demo@vouchmi.com', 'username' => 'studioluy', 'display_name' => 'Studio Luy', 'role' => 'brand', 'bio' => 'Handgefertigtes aus Italien — Interior, das Geschichten erzählt.'],
        ];

        foreach ($demos as $d) {
            DB::table('users')->insert([
                'id' => $d['id'], 'email' => $d['email'], 'username' => $d['username'],
                'display_name' => $d['display_name'], 'password' => $hash, 'role' => $d['role'],
                'bio' => $d['bio'], 'phone' => $d['phone'] ?? null,
                'avatar_url' => "https://api.dicebear.com/9.x/avataaars/svg?seed={$d['id']}",
                'email_verified_at' => $now, 'is_seed' => true,
                'tier' => $d['role'] === 'influencer' ? 'bronze' : 'none',
                'tier_badge_opacity' => 1.0,
                'created_at' => $now, 'updated_at' => $now,
            ]);
        }
        $this->allUserIds = [self::USER_DEMO, self::INFLUENCER, self::BRAND_DEMO];

        // Brand profile for demo brand
        $brandProfileId = Str::uuid()->toString();
        DB::table('brand_profiles')->insert([
            'id' => $brandProfileId, 'user_id' => self::BRAND_DEMO,
            'brand_name' => 'Studio Luy', 'brand_slug' => 'studio-luy',
            'description' => 'Handgefertigtes Interior aus Italien.',
            'company_email' => 'brand-demo@vouchmi.com',
            'paypal_email' => 'brand-demo@vouchmi.com',
            'paypal_subscription_id' => 'I-SEED-DEMO-BRAND',
            'paypal_status' => 'ACTIVE',
            'subscription_started_at' => $now->copy()->subDays(30),
            'subscription_plan' => 'starter',
            'subscription_expires_at' => $now->copy()->addDays(25),
            'created_at' => $now, 'updated_at' => $now,
        ]);

        // 12 fake users
        $bios = [
            'Designerin aus Hamburg, sammelt Keramik.', 'Softwareentwickler, kocht gerne am Wochenende.',
            'Mama von zwei Kindern. Immer auf der Suche nach dem besten Spielzeug.',
            'Läufer und Outdoor-Fan. Gear-Nerd seit 2018.', 'Studentin aus München. Beauty ohne Bullshit.',
            'Nachhaltig leben, ohne auf Style zu verzichten.', 'Home-Office seit 2020. Setup-Optimierer.',
            'Foodie aus Berlin. Küchengeräte sind mein Schwachpunkt.',
            'Minimalismus-Fan. Weniger Dinge, bessere Dinge.',
            'Papa, Ingenieur, Hobby-Barista. Espresso > Filterkaffee.',
            'Yogalehrerin aus Freiburg. Naturkosmetik-Junkee.',
            'Freelancer und Digital Nomad. Reise-Gadgets sind mein Ding.',
        ];
        $roles = ['user','user','user','user','user','user','user','user','influencer','influencer','influencer','influencer'];

        for ($i = 0; $i < 12; $i++) {
            $uid = Str::uuid()->toString();
            $this->allUserIds[] = $uid;
            $first = $faker->firstName();
            $last = $faker->lastName();
            DB::table('users')->insert([
                'id' => $uid, 'email' => $faker->unique()->safeEmail(),
                'username' => strtolower($first) . '_' . strtolower(substr($last, 0, 1)) . $faker->numberBetween(1, 99),
                'display_name' => "$first " . substr($last, 0, 1) . '.',
                'password' => $hash, 'role' => $roles[$i], 'bio' => $bios[$i],
                'avatar_url' => "https://api.dicebear.com/9.x/avataaars/svg?seed={$uid}",
                'email_verified_at' => $now, 'is_seed' => true,
                'tier' => $roles[$i] === 'influencer' ? 'bronze' : 'none',
                'tier_badge_opacity' => 1.0,
                'created_at' => $now->copy()->subDays($faker->numberBetween(5, 60)),
                'updated_at' => $now,
            ]);
        }
    }

    private function seedCommunities(): void
    {
        $data = [
            ['slug' => 'interior-lover', 'name' => 'Interior-Lover', 'category' => 'Interior', 'image_url' => 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=400'],
            ['slug' => 'tech-tipps', 'name' => 'Tech-Tipps', 'category' => 'Tech', 'image_url' => 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400'],
            ['slug' => 'kuechen-profis', 'name' => 'Küchen-Profis', 'category' => 'Food', 'image_url' => 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400'],
            ['slug' => 'beauty-care', 'name' => 'Beauty & Care', 'category' => 'Beauty', 'image_url' => 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400'],
            ['slug' => 'sport-outdoor', 'name' => 'Sport & Outdoor', 'category' => 'Sport', 'image_url' => 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400'],
            ['slug' => 'eltern-netzwerk', 'name' => 'Eltern-Netzwerk', 'category' => 'Familie', 'image_url' => 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400'],
            ['slug' => 'home-office', 'name' => 'Home-Office', 'category' => 'Tech', 'image_url' => 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400'],
            ['slug' => 'nachhaltig-leben', 'name' => 'Nachhaltig leben', 'category' => 'Nachhaltigkeit', 'image_url' => 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=400'],
        ];
        $now = now();

        foreach ($data as $i => $c) {
            $ownerId = $this->allUserIds[3 + ($i % 12)]; // rotating fake users as owners
            DB::table('communities')->insert([
                'id' => self::COMMUNITIES[$i], 'name' => $c['name'], 'slug' => $c['slug'],
                'description' => $c['name'] . ' Community', 'image_url' => $c['image_url'],
                'category' => $c['category'], 'owner_id' => $ownerId,
                'member_count' => 0, 'is_private' => false,
                'created_at' => $now->copy()->subDays(45), 'updated_at' => $now,
            ]);
        }
    }

    private function seedMemberships($faker): void
    {
        $now = now();
        $slugToId = array_combine(
            ['interior-lover','tech-tipps','kuechen-profis','beauty-care','sport-outdoor','eltern-netzwerk','home-office','nachhaltig-leben'],
            self::COMMUNITIES
        );

        // Demo user in 4 communities
        foreach (['interior-lover','kuechen-profis','beauty-care','tech-tipps'] as $slug) {
            $this->addMember($slugToId[$slug], self::USER_DEMO, 'member', $now->copy()->subDays($faker->numberBetween(10, 50)));
        }

        // Influencer in 5 random
        $infComms = $faker->randomElements(self::COMMUNITIES, 5);
        foreach ($infComms as $cid) {
            $this->addMember($cid, self::INFLUENCER, 'member', $now->copy()->subDays($faker->numberBetween(5, 40)));
        }

        // Brand in 2 communities
        $this->addMember($slugToId['interior-lover'], self::BRAND_DEMO, 'member', $now->copy()->subDays(30));
        $this->addMember($slugToId['nachhaltig-leben'], self::BRAND_DEMO, 'member', $now->copy()->subDays(25));

        // Fake users: each in 2-5 random communities
        for ($i = 3; $i < count($this->allUserIds); $i++) {
            $count = $faker->numberBetween(2, 5);
            $comms = $faker->randomElements(self::COMMUNITIES, $count);
            foreach ($comms as $cid) {
                $this->addMember($cid, $this->allUserIds[$i], 'member', $now->copy()->subDays($faker->numberBetween(1, 60)));
            }
        }

        // Update member counts
        foreach (self::COMMUNITIES as $cid) {
            $count = DB::table('community_members')->where('community_id', $cid)->count();
            DB::table('communities')->where('id', $cid)->update(['member_count' => $count]);
        }
    }

    private function addMember(string $communityId, string $userId, string $role, $joinedAt): void
    {
        if (DB::table('community_members')->where('community_id', $communityId)->where('user_id', $userId)->exists()) return;
        DB::table('community_members')->insert([
            'community_id' => $communityId, 'user_id' => $userId,
            'role' => $role, 'joined_at' => $joinedAt,
        ]);
        $this->communityMembers[$communityId][] = $userId;
    }

    private function seedPosts($faker): void
    {
        $fixtures = require __DIR__ . '/Fixtures/posts.php';
        $now = now();
        $slugToId = array_combine(
            ['interior-lover','tech-tipps','kuechen-profis','beauty-care','sport-outdoor','eltern-netzwerk','home-office','nachhaltig-leben'],
            self::COMMUNITIES
        );

        $comments = [
            'Seit 3 Monaten im Einsatz — beste Investition des Jahres.',
            'Minimal aber gut verarbeitet. Passt zu jedem Stil.',
            'Perfektes Geschenk. Hat meine Schwester direkt nachbestellt.',
            'Preis/Leistung unschlagbar. Liefert in 2 Tagen.',
            'Nach viel Recherche endlich das gefunden, was ich wollte.',
            'Schon dreimal nachgekauft, hält ewig.',
            'Sieht auf Bildern besser aus als im Laden — hier ausnahmsweise wirklich so.',
            'Kollegin hat mir das empfohlen, musste direkt selbst haben.',
            'Qualität ist top, Verpackung auch nachhaltig.',
            'Für den Preis unglaublich gut. Gibt nichts zu meckern.',
            'Hatte Bedenken, aber die Reviews hier haben mich überzeugt.',
            'Nutze das täglich. Kann nicht mehr ohne.',
            'Deutlich besser als die teurere Alternative von der Konkurrenz.',
            'Mein Lieblingsstück in der Küche / im Büro / im Bad.',
            'War lange auf der Suche — endlich fündig geworden.',
            'Design und Funktion passen perfekt zusammen.',
            'Mega Tipp! Danke für die Empfehlung.',
            'Habe es verschenkt und direkt nochmal für mich bestellt.',
            'Endlich ein Produkt, das hält was es verspricht.',
            'Überraschend gut für den Preis. Klare Empfehlung.',
        ];

        $sources = ['app','app','app','app','app','app','app','share_extension','share_extension','widget'];
        $postCount = 0;

        // Demo user's 12 posts
        $demoPostComms = ['interior-lover','interior-lover','interior-lover','interior-lover','kuechen-profis','kuechen-profis','kuechen-profis','beauty-care','beauty-care','beauty-care','tech-tipps','tech-tipps'];
        foreach ($demoPostComms as $j => $slug) {
            $cid = $slugToId[$slug];
            $fixture = $faker->randomElement(array_filter($fixtures, fn($f) => $f['community_slug'] === $slug));
            $daysAgo = $faker->numberBetween(1, 14);
            DB::table('posts')->insert([
                'id' => Str::uuid()->toString(), 'community_id' => $cid, 'author_id' => self::USER_DEMO,
                'content' => $faker->randomElement($comments), 'post_type' => 'link',
                'link_url' => $fixture['url'], 'link_title' => $fixture['title'],
                'link_image' => $fixture['image_url'], 'link_domain' => $fixture['domain'],
                'link_price' => $fixture['price'] ?? null,
                'like_count' => $faker->numberBetween(3, 8), 'comment_count' => $faker->numberBetween(0, 3),
                'created_at' => $now->copy()->subDays($daysAgo)->subHours($faker->numberBetween(0, 12)),
                'updated_at' => $now,
            ]);
            $postCount++;
        }

        // ~190 more posts across communities
        foreach ($slugToId as $slug => $cid) {
            $members = $this->communityMembers[$cid] ?? [];
            if (empty($members)) continue;
            $communityFixtures = array_filter($fixtures, fn($f) => $f['community_slug'] === $slug);
            if (empty($communityFixtures)) continue;
            $communityFixtures = array_values($communityFixtures);

            for ($p = 0; $p < 23; $p++) {
                $fixture = $communityFixtures[$p % count($communityFixtures)];
                $author = $faker->randomElement($members);
                // Weight towards recent: 60% in last 7 days
                $daysAgo = $faker->boolean(60) ? $faker->numberBetween(0, 7) : $faker->numberBetween(8, 45);

                DB::table('posts')->insert([
                    'id' => Str::uuid()->toString(), 'community_id' => $cid, 'author_id' => $author,
                    'content' => $faker->randomElement($comments), 'post_type' => 'link',
                    'link_url' => $fixture['url'], 'link_title' => $fixture['title'],
                    'link_image' => $fixture['image_url'], 'link_domain' => $fixture['domain'],
                    'link_price' => $fixture['price'] ?? null,
                    'like_count' => 0, 'comment_count' => 0,
                    'created_at' => $now->copy()->subDays($daysAgo)->subHours($faker->numberBetween(0, 23)),
                    'updated_at' => $now,
                ]);
                $postCount++;
            }
        }
    }

    private function seedEngagement($faker): void
    {
        $posts = DB::table('posts')->whereIn('community_id', self::COMMUNITIES)->get(['id', 'community_id', 'author_id']);
        $now = now();

        // Likes (~600)
        foreach ($posts as $post) {
            $members = $this->communityMembers[$post->community_id] ?? [];
            $others = array_filter($members, fn($m) => $m !== $post->author_id);
            if (empty($others)) continue;

            // Distribution: 30% 0-1, 50% 2-5, 20% 5-15
            $r = $faker->numberBetween(1, 100);
            $likeCount = $r <= 30 ? $faker->numberBetween(0, 1) : ($r <= 80 ? $faker->numberBetween(2, 5) : $faker->numberBetween(5, min(15, count($others))));
            $likers = $faker->randomElements($others, min($likeCount, count($others)));

            foreach ($likers as $liker) {
                DB::table('likes')->insertOrIgnore(['post_id' => $post->id, 'user_id' => $liker, 'created_at' => $now->copy()->subDays($faker->numberBetween(0, 7))]);
            }
            DB::table('posts')->where('id', $post->id)->update(['like_count' => count($likers)]);
        }

        // Comments (~200)
        $commentTemplates = [
            'Mega Tipp, danke!', 'Hab ich auch, kann ich bestätigen!', 'Wo gibts das günstiger?',
            'Steht schon auf meiner Wunschliste 🙌', 'Wie lange hält das bei dir schon?',
            'Danke für den Tipp!', 'Perfekt, genau was ich gesucht habe.', 'Sieht super aus!',
            'Hast du auch die andere Farbe probiert?', 'Top Empfehlung 👍',
            'Hatte ich auch ins Auge gefasst.', 'Sehr schick!', 'Endlich mal was Gutes in dem Preissegment.',
            'Muss ich haben!', 'Wurde mir auch schon empfohlen.', 'Geile Farbe!',
            'Kommt auf die Liste.', 'Bestellt, danke!', 'Wie ist die Qualität?', 'Nice find!',
        ];

        $postsForComments = $faker->randomElements($posts->toArray(), min(200, $posts->count()));
        foreach ($postsForComments as $post) {
            $members = $this->communityMembers[$post->community_id] ?? [];
            if (empty($members)) continue;
            $commenter = $faker->randomElement($members);
            DB::table('comments')->insert([
                'id' => Str::uuid()->toString(), 'post_id' => $post->id, 'author_id' => $commenter,
                'content' => $faker->randomElement($commentTemplates),
                'created_at' => $now->copy()->subDays($faker->numberBetween(0, 5)),
                'updated_at' => $now,
            ]);
            DB::table('posts')->where('id', $post->id)->increment('comment_count');
        }

        // Bookmarks: Demo user gets 30
        $demoBookmarks = $faker->randomElements($posts->toArray(), min(30, $posts->count()));
        foreach ($demoBookmarks as $post) {
            DB::table('bookmarks')->insertOrIgnore([
                'id' => Str::uuid()->toString(), 'user_id' => self::USER_DEMO, 'post_id' => $post->id,
                'created_at' => $now, 'updated_at' => $now,
            ]);
        }
    }

    private function seedFollows($faker): void
    {
        $now = now();
        // Demo follows influencer + 5 others
        $demoFollows = [self::INFLUENCER, ...$faker->randomElements(array_slice($this->allUserIds, 3), 5)];
        foreach ($demoFollows as $target) {
            DB::table('follows')->insertOrIgnore([
                'id' => Str::uuid()->toString(), 'follower_id' => self::USER_DEMO, 'following_id' => $target,
                'created_at' => $now, 'updated_at' => $now,
            ]);
        }

        // Each fake user follows 3-7 random others
        for ($i = 3; $i < count($this->allUserIds); $i++) {
            $count = $faker->numberBetween(3, 7);
            $targets = $faker->randomElements(array_filter($this->allUserIds, fn($u) => $u !== $this->allUserIds[$i]), $count);
            foreach ($targets as $t) {
                DB::table('follows')->insertOrIgnore([
                    'id' => Str::uuid()->toString(), 'follower_id' => $this->allUserIds[$i], 'following_id' => $t,
                    'created_at' => $now->copy()->subDays($faker->numberBetween(0, 30)), 'updated_at' => $now,
                ]);
            }
        }
    }

    private function seedDrops(): void
    {
        $brandProfile = DB::table('brand_profiles')->where('user_id', self::BRAND_DEMO)->first();
        if (!$brandProfile) return;
        $now = now();

        $drops = [
            ['id' => '00000000-0000-0000-0000-000000000101', 'title' => '4er Set Tischsets LOU + NOA', 'image_url' => 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=600', 'original_price' => 89.00, 'drop_price' => 59.00, 'starts_at' => $now->copy()->subMinutes(75), 'expires_at' => $now->copy()->addMinutes(45), 'stock_limit' => 50, 'stock_claimed' => 42, 'participant_count' => 18, 'status' => 'active'],
            ['id' => '00000000-0000-0000-0000-000000000102', 'title' => 'Vase NOÉMIE – Handgedreht', 'image_url' => 'https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae?w=600', 'original_price' => 65.00, 'drop_price' => 45.00, 'starts_at' => $now->copy()->subMinutes(30), 'expires_at' => $now->copy()->addHours(3), 'stock_limit' => null, 'stock_claimed' => 0, 'participant_count' => 7, 'status' => 'active'],
            ['id' => '00000000-0000-0000-0000-000000000103', 'title' => 'Läufer ESCAPE – 80×200', 'image_url' => 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600', 'original_price' => 129.00, 'drop_price' => 89.00, 'starts_at' => $now->copy()->subDays(2), 'expires_at' => $now->copy()->subDay(), 'stock_limit' => 30, 'stock_claimed' => 30, 'participant_count' => 24, 'status' => 'ended'],
        ];

        foreach ($drops as $d) {
            DB::table('sponsored_drops')->insert([
                'id' => $d['id'], 'brand_id' => $brandProfile->id,
                'community_id' => self::COMMUNITIES[0], // interior-lover
                'title' => $d['title'], 'image_url' => $d['image_url'],
                'product_url' => 'https://studioluy.de', 'status' => $d['status'],
                'original_price' => $d['original_price'], 'drop_price' => $d['drop_price'],
                'stock_limit' => $d['stock_limit'], 'stock_claimed' => $d['stock_claimed'],
                'participant_count' => $d['participant_count'],
                'starts_at' => $d['starts_at'], 'expires_at' => $d['expires_at'],
                'votes_yes' => 12, 'votes_no' => 1,
                'created_at' => $d['starts_at'], 'updated_at' => $now,
            ]);
        }
    }
}
