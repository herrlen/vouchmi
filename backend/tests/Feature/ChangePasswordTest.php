<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ChangePasswordTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_change_password_with_correct_current_password(): void
    {
        $user = User::factory()->create(['password' => Hash::make('alt-passwort')]);
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/auth/change-password', [
            'current_password'      => 'alt-passwort',
            'password'              => 'neues-passwort',
            'password_confirmation' => 'neues-passwort',
        ]);

        $response->assertOk();
        $this->assertTrue(Hash::check('neues-passwort', $user->fresh()->password));
    }

    public function test_change_password_rejects_wrong_current_password(): void
    {
        $user = User::factory()->create(['password' => Hash::make('alt-passwort')]);
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/auth/change-password', [
            'current_password'      => 'falsch',
            'password'              => 'neues-passwort',
            'password_confirmation' => 'neues-passwort',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('current_password');
        $this->assertTrue(Hash::check('alt-passwort', $user->fresh()->password));
    }

    public function test_change_password_rejects_when_confirmation_mismatches(): void
    {
        $user = User::factory()->create(['password' => Hash::make('alt-passwort')]);
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/auth/change-password', [
            'current_password'      => 'alt-passwort',
            'password'              => 'neues-passwort',
            'password_confirmation' => 'tippfehler',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('password');
    }

    public function test_change_password_rejects_too_short_password(): void
    {
        $user = User::factory()->create(['password' => Hash::make('alt-passwort')]);
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/auth/change-password', [
            'current_password'      => 'alt-passwort',
            'password'              => 'kurz',
            'password_confirmation' => 'kurz',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('password');
    }

    public function test_change_password_rejects_when_new_equals_current(): void
    {
        $user = User::factory()->create(['password' => Hash::make('selbe-passwort')]);
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/auth/change-password', [
            'current_password'      => 'selbe-passwort',
            'password'              => 'selbe-passwort',
            'password_confirmation' => 'selbe-passwort',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('password');
    }

    public function test_change_password_requires_authentication(): void
    {
        $response = $this->postJson('/api/auth/change-password', [
            'current_password'      => 'irgendwas',
            'password'              => 'neues-passwort',
            'password_confirmation' => 'neues-passwort',
        ]);

        $response->assertStatus(401);
    }
}
