const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title:    { type: String, required: true, trim: true, maxlength: 200 },
  body:     { type: String, required: true },
  category: {
    type: String,
    enum: ['general','craft','design','technology','lifestyle','culture','personal','other'],
    default: 'general'
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
}, { timestamps: true });

// Virtual: comment count (populated separately when needed)
postSchema.virtual('commentCount');

module.exports = mongoose.model('Post', postSchema);
