<?php
// app/Models/Comment.php
namespace App\Models;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
class Comment extends Model {
    use HasUuids;
    protected $fillable = ['post_id','author_id','content'];
    public function author() { return $this->belongsTo(User::class, 'author_id'); }
}

// app/Models/Message.php — separate Datei in Produktion
// app/Models/BrandProfile.php — separate Datei in Produktion
// app/Models/SponsoredDrop.php — separate Datei in Produktion
// app/Models/Invite.php — separate Datei in Produktion
