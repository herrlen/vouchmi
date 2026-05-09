<?php

namespace App\Http\Controllers\Api\V1;

use App\Exceptions\AppStore\AppleServiceUnavailableException;
use App\Exceptions\AppStore\InvalidBundleException;
use App\Exceptions\AppStore\InvalidProductException;
use App\Exceptions\AppStore\InvalidSignatureException;
use App\Exceptions\AppStore\TransactionAlreadyClaimedException;
use App\Exceptions\AppStore\TransactionExpiredException;
use App\Http\Controllers\Controller;
use App\Services\AppStore\IapValidationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class IapValidationController extends Controller
{
    public function __construct(
        private readonly IapValidationService $service,
    ) {}

    public function validate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'transaction_id' => ['required', 'string', 'max:255'],
        ]);

        $user = $request->user();

        try {
            $subscription = $this->service->validateAndSync($user, $data['transaction_id']);
        } catch (TransactionAlreadyClaimedException $e) {
            return response()->json([
                'message' => 'Diese Transaktion gehört zu einem anderen Konto.',
            ], 403);
        } catch (InvalidBundleException | InvalidProductException | InvalidSignatureException | TransactionExpiredException $e) {
            Log::info('apple_iap.validate.rejected', [
                'reason'           => $e->getMessage(),
                'transaction_tail' => substr($data['transaction_id'], -4),
            ]);
            return response()->json([
                'message' => 'Transaktion ungültig oder abgelaufen.',
            ], 422);
        } catch (AppleServiceUnavailableException $e) {
            Log::warning('apple_iap.validate.upstream_unavailable', [
                'reason' => $e->getMessage(),
            ]);
            return response()->json([
                'message' => 'Apple-Service vorübergehend nicht erreichbar.',
            ], 503);
        }

        return response()->json([
            'subscription' => [
                'uuid'              => $subscription->id,
                'provider'          => 'apple_iap',
                'status'            => $subscription->status,
                'expires_at'        => $subscription->expires_at?->toIso8601String(),
                'product_id'        => $subscription->apple_product_id,
                'auto_renew_status' => (bool) $subscription->auto_renew,
            ],
        ]);
    }
}
