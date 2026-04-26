<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class VouchmiSetPasswordCommand extends Command
{
    protected $signature = 'vouchmi:set-password {email} {password}';
    protected $description = 'Set a user\'s password by email (bypasses API validation; ops/dev tool)';

    public function handle(): int
    {
        $email = $this->argument('email');
        $password = $this->argument('password');

        $user = User::where('email', $email)->first();
        if (!$user) {
            $this->error("User not found: {$email}");
            return 1;
        }

        $user->password = Hash::make($password);
        $user->save();

        // Invalidate any existing tokens so stale clients must re-login.
        $user->tokens()->delete();

        $this->info("✓ Password updated for {$email} (role: {$user->role}). Existing tokens revoked.");
        return 0;
    }
}
