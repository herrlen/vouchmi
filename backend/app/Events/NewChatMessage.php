<?php
// app/Events/NewChatMessage.php
namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NewChatMessage implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Message $message) {}

    public function broadcastOn(): Channel
    {
        return new PrivateChannel('community.' . $this->message->community_id);
    }

    public function broadcastWith(): array
    {
        return [
            'message' => [
                'id' => $this->message->id,
                'content' => $this->message->content,
                'sender' => $this->message->sender->only('id', 'username', 'display_name', 'avatar_url'),
                'product_slug' => $this->message->product_slug,
                'product_title' => $this->message->product_title,
                'product_image_url' => $this->message->product_image_url,
                'product_price' => $this->message->product_price,
                'created_at' => $this->message->created_at->toISOString(),
            ],
        ];
    }
}
