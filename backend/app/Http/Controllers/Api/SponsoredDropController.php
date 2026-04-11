<?php
// app/Http/Controllers/Api/SponsoredDropController.php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SponsoredDrop;
use App\Services\ReviveAdService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SponsoredDropController extends Controller
{
    public function __construct(private ReviveAdService $revive) {}

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
}
