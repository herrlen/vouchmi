<?php
// app/Http/Controllers/Api/ChatController.php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Message;
use App\Events\NewChatMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChatController extends Controller
{
    public function index(string $communityId, Request $request): JsonResponse
    {
        $messages = Message::where('community_id', $communityId)
            ->with('sender:id,username,display_name,avatar_url')
            ->orderBy('created_at')
            ->limit($request->input('limit', 100))
            ->when($request->has('after'), fn($q) =>
                $q->where('created_at', '>', $request->input('after'))
            )
            ->get();

        return response()->json(['messages' => $messages]);
    }

    public function store(string $communityId, Request $request): JsonResponse
    {
        $data = $request->validate([
            'content' => 'required|string|max:5000',
            'product_slug' => 'nullable|string',
            'product_title' => 'nullable|string',
            'product_image_url' => 'nullable|url',
            'product_price' => 'nullable|numeric',
        ]);

        $message = Message::create([
            'community_id' => $communityId,
            'sender_id' => $request->user()->id,
            ...$data,
        ]);

        $message->load('sender:id,username,display_name,avatar_url');

        // Broadcast via Laravel Reverb / Pusher / Soketi
        broadcast(new NewChatMessage($message))->toOthers();

        return response()->json(['message' => $message], 201);
    }

    /**
     * Gibt ein kurzlebiges Token für die WebSocket-Verbindung zurück.
     * Wird von der App genutzt um sich mit Laravel Reverb zu verbinden.
     */
    public function getWebSocketToken(Request $request): JsonResponse
    {
        return response()->json([
            'ws_url' => config('broadcasting.connections.reverb.options.host'),
            'ws_port' => config('broadcasting.connections.reverb.options.port'),
            'token' => $request->user()->createToken('ws', ['chat:listen'], now()->addHours(2))->plainTextToken,
        ]);
    }
}
