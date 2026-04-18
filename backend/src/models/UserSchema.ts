import mongoose, { Schema } from 'mongoose';
import { User } from './User';

export interface UserDocument extends Omit<User, 'id'> {
  _id: string;
}

const UserSchema = new Schema<UserDocument>(
  {
    _id: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    apiKey: { type: String, required: true, unique: true, index: true },
    createdAt: { type: Number, required: true },
  },
  {
    timestamps: false,
  }
);

export const UserModel = mongoose.model<UserDocument>('User', UserSchema);
