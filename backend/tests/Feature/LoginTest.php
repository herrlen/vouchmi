<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class LoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_with_email_works(): void
    {
        User::factory()->create([
            'email'    => 'lenny@example.com',
            'username' => 'lenny',
            'password' => Hash::make('geheim123'),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'identifier' => 'lenny@example.com',
            'password'   => 'geheim123',
        ]);

        $response->assertOk()->assertJsonStructure(['user' => ['email'], 'token']);
    }

    public function test_login_with_username_works(): void
    {
        User::factory()->create([
            'email'    => 'lenny@example.com',
            'username' => 'lenny',
            'password' => Hash::make('geheim123'),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'identifier' => 'lenny',
            'password'   => 'geheim123',
        ]);

        $response->assertOk();
    }

    public function test_login_with_username_is_case_insensitive(): void
    {
        User::factory()->create([
            'username' => 'lenny',
            'password' => Hash::make('geheim123'),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'identifier' => 'LENNY',
            'password'   => 'geheim123',
        ]);

        $response->assertOk();
    }

    public function test_login_legacy_email_field_still_works(): void
    {
        User::factory()->create([
            'email'    => 'lenny@example.com',
            'password' => Hash::make('geheim123'),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email'    => 'lenny@example.com',
            'password' => 'geheim123',
        ]);

        $response->assertOk();
    }

    public function test_login_rejects_unknown_identifier(): void
    {
        User::factory()->create(['username' => 'lenny', 'password' => Hash::make('geheim123')]);

        $response = $this->postJson('/api/auth/login', [
            'identifier' => 'doesnotexist',
            'password'   => 'geheim123',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('identifier');
    }

    public function test_login_rejects_wrong_password(): void
    {
        User::factory()->create([
            'username' => 'lenny',
            'password' => Hash::make('geheim123'),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'identifier' => 'lenny',
            'password'   => 'falsch',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('identifier');
    }

    public function test_login_requires_identifier_or_email(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'password' => 'geheim123',
        ]);

        $response->assertStatus(422);
    }
}
