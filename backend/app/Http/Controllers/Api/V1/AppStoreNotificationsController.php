<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessAppStoreNotificationJob;
use App\Models\AppStoreNotification;
use App\Services\AppStore\JwsVerifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Apple posts App Store Server Notifications V2 to this endpoint.
 *
 * Apple cannot authenticate, so the route is public — but every payload
 * is JWS-signed and verified before we touch the DB. The endpoint must
 * acknowledge under 5s, so persistence + heavy work is dispatched to a
 * queue job.
 */
class AppStoreNotificationsController extends Controller
{
    public function __construct(
        private readonly JwsVerifier $verifier,
    ) {}

    public function handle(Request $request): JsonResponse
    {
        $signedPayload = $request->input('signedPayload');
        if (!is_string($signedPayload) || $signedPayload === '') {
            return response()->json(['ok' => false, 'reason' => 'missing signedPayload'], 400);
        }

        // Pre-verify signature before writing to DB to prevent spam-driven
        // table bloat. Full re-decode happens in the job.
        try {
            $payload = $this->verifier->verifyAndDecode($signedPayload);
        } catch (\Throwable $e) {
            Log::warning('apple_iap.notification.invalid_signature', [
                'reason' => $e->getMessage(),
            ]);
            return response()->json(['ok' => false, 'reason' => 'invalid signature'], 401);
        }

        $notificationUuid = (string) ($payload['notificationUUID'] ?? '');
        if ($notificationUuid === '') {
            return response()->json(['ok' => false, 'reason' => 'missing notificationUUID'], 400);
        }

        // Idempotency guard: if we already saw this UUID and processed it,
        // ack immediately. If we saw it but failed last time, the job will
        // pick up the existing row.
        $notification = AppStoreNotification::firstOrCreate(
            ['notification_uuid' => $notificationUuid],
            [
                'notification_type' => (string) ($payload['notificationType'] ?? 'UNKNOWN'),
                'subtype'           => $payload['subtype'] ?? null,
                'signed_payload'    => $signedPayload,
            ]
        );

        if ($notification->processed_at !== null) {
            return response()->json(['ok' => true, 'duplicate' => true]);
        }

        ProcessAppStoreNotificationJob::dispatch($notification->id)->onQueue('app_store');

        return response()->json(['ok' => true]);
    }
}
