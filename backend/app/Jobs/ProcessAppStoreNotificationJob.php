<?php

namespace App\Jobs;

use App\Models\AppStoreNotification;
use App\Services\AppStore\NotificationHandler;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessAppStoreNotificationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 5;

    /** @return int[] */
    public function backoff(): array
    {
        return [60, 300, 900, 3600, 10800];
    }

    public function __construct(
        public string $notificationId,
    ) {
        $this->onQueue('app_store');
    }

    public function handle(NotificationHandler $handler): void
    {
        $notification = AppStoreNotification::find($this->notificationId);
        if (!$notification) {
            Log::warning('apple_iap.job.notification_missing', ['id' => $this->notificationId]);
            return;
        }

        $handler->handlePersisted($notification);
    }

    public function failed(\Throwable $e): void
    {
        Log::error('apple_iap.job.failed_finally', [
            'notification_id' => $this->notificationId,
            'error'           => $e->getMessage(),
        ]);
    }
}
