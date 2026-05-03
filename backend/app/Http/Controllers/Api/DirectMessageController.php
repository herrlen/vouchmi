<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\DirectMessage;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DirectMessageController extends Controller
{
    /**
     * POST /api/dm/send
     */
    public function send(Request $request): JsonResponse
    {
        $data = $request->validate([
            'receiver_id' => 'required|uuid|exists:users,id|different:sender_id',
            'content'     => 'required_without:post_id|nullable|string|max:5000',
            'post_id'     => 'nullable|uuid|exists:posts,id',
        ]);

        $me = $request->user();

        if ($data['receiver_id'] === $me->id) {
            return response()->json(['message' => 'Du kannst dir nicht selbst schreiben.'], 422);
        }

        $receiver = User::findOrFail($data['receiver_id']);

        // Prüfe ob schon eine Konversation existiert (dann darf jeder antworten)
        $hasExisting = Conversation::query()
            ->where(function ($q) use ($me, $receiver) {
                [$one, $two] = $me->id < $receiver->id ? [$me->id, $receiver->id] : [$receiver->id, $me->id];
                $q->where('user_one_id', $one)->where('user_two_id', $two);
            })
            ->whereHas('messages')
            ->exists();

        if (!$hasExisting && !$me->canInitiateMessage($receiver)) {
            return response()->json(['message' => 'Du kannst diese Person nicht anschreiben.'], 403);
        }

        $message = DB::transaction(function () use ($data, $me) {
            $conversation = Conversation::between($me->id, $data['receiver_id']);

            $message = DirectMessage::create([
                'conversation_id' => $conversation->id,
                'sender_id'       => $me->id,
                'receiver_id'     => $data['receiver_id'],
                'content'         => $data['content'] ?? '',
                'post_id'         => $data['post_id'] ?? null,
            ]);

            $conversation->update(['last_message_at' => $message->created_at]);

            return $message;
        });

        $message->load([
            'sender:id,username,display_name,avatar_url',
            'post:id,author_id,content,link_url,link_title,link_image,link_price',
        ]);

        // Push an den Empfänger.
        try {
            $name = $me->display_name ?: $me->username;
            $body = trim((string) ($data['content'] ?? '')) !== ''
                ? \Illuminate\Support\Str::limit($data['content'], 140)
                : 'hat dir eine Nachricht gesendet.';
            app(\App\Services\PushNotificationService::class)->sendToUser(
                $data['receiver_id'],
                $name,
                $body,
                ['type' => 'dm', 'user_id' => $me->id]
            );
        } catch (\Throwable $e) {
            \Log::warning("[Push:dm] {$e->getMessage()}");
        }

        return response()->json(['message' => $message], 201);
    }

    /**
     * GET /api/dm/conversations
     */
    public function conversations(Request $request): JsonResponse
    {
        $meId = $request->user()->id;

        $conversations = Conversation::query()
            ->where(function ($q) use ($meId) {
                $q->where('user_one_id', $meId)->orWhere('user_two_id', $meId);
            })
            ->with([
                'userOne:id,username,display_name,avatar_url,role',
                'userTwo:id,username,display_name,avatar_url,role',
            ])
            ->orderByDesc('last_message_at')
            ->limit(100)
            ->get();

        $conversationIds = $conversations->pluck('id');

        $maxTimes = DB::table('direct_messages')
            ->whereIn('conversation_id', $conversationIds)
            ->selectRaw('conversation_id, MAX(created_at) as max_created_at')
            ->groupBy('conversation_id')
            ->get();

        $lastMessages = collect();
        foreach ($maxTimes as $row) {
            $msg = DirectMessage::where('conversation_id', $row->conversation_id)
                ->where('created_at', $row->max_created_at)
                ->first();
            if ($msg) {
                $lastMessages->put($row->conversation_id, $msg);
            }
        }

        $unreadCounts = DirectMessage::query()
            ->whereIn('conversation_id', $conversationIds)
            ->where('receiver_id', $meId)
            ->whereNull('read_at')
            ->selectRaw('conversation_id, COUNT(*) as c')
            ->groupBy('conversation_id')
            ->pluck('c', 'conversation_id');

        $payload = $conversations->map(function (Conversation $c) use ($meId, $lastMessages, $unreadCounts) {
            $otherUser = $c->user_one_id === $meId ? $c->userTwo : $c->userOne;
            $last = $lastMessages->get($c->id);

            return [
                'id'              => $c->id,
                'other_user'      => [
                    'id'           => $otherUser->id,
                    'username'     => $otherUser->username,
                    'display_name' => $otherUser->display_name,
                    'avatar_url'   => $otherUser->avatar_url,
                    'role'         => $otherUser->role,
                    'is_active'    => $otherUser->hasActiveSubscription(),
                ],
                'last_message'    => $last ? [
                    'id'         => $last->id,
                    'content'    => $last->content,
                    'sender_id'  => $last->sender_id,
                    'post_id'    => $last->post_id,
                    'read_at'    => $last->read_at,
                    'created_at' => $last->created_at,
                ] : null,
                'last_message_at' => $c->last_message_at,
                'unread_count'    => (int) ($unreadCounts[$c->id] ?? 0),
            ];
        });

        return response()->json(['conversations' => $payload]);
    }

    /**
     * GET /api/dm/conversations/{userId}
     * Thread mit einem anderen User — paginiert (neueste zuerst).
     */
    public function thread(string $userId, Request $request): JsonResponse
    {
        $request->validate(['per_page' => 'nullable|integer|min:1|max:100']);
        $me = $request->user();

        if ($userId === $me->id) {
            return response()->json(['message' => 'Ungültiger Empfänger.'], 422);
        }

        $conversation = Conversation::between($me->id, $userId);

        $messages = DirectMessage::where('conversation_id', $conversation->id)
            ->with([
                'sender:id,username,display_name,avatar_url',
                'post:id,author_id,content,link_url,link_affiliate_url,link_title,link_image,link_price,link_domain',
            ])
            ->orderByDesc('created_at')
            ->paginate($request->integer('per_page', 30));

        return response()->json([
            'conversation_id' => $conversation->id,
            'messages'        => $messages,
        ]);
    }

    /**
     * PATCH /api/dm/read/{userId}
     * Alle Nachrichten des anderen Users als gelesen markieren.
     */
    public function markRead(string $userId, Request $request): JsonResponse
    {
        $me = $request->user();
        $conversation = Conversation::between($me->id, $userId);

        $updated = DirectMessage::where('conversation_id', $conversation->id)
            ->where('receiver_id', $me->id)
            ->where('sender_id', $userId)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json([
            'conversation_id' => $conversation->id,
            'marked_read'     => $updated,
        ]);
    }
}
