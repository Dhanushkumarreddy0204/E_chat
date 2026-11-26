import { Bell, Bookmark, Compass, Home, MessageCircle, PlaySquare, UserRound } from 'lucide-react';

export const navigation = [
  { name: 'Home', path: '/', icon: Home, mobile: true },
  { name: 'Explore', path: '/explore', icon: Compass, mobile: true },
  { name: 'Clips', path: '/clips', icon: PlaySquare, mobile: true },
  { name: 'Messages', path: '/messages', icon: MessageCircle, mobile: true },
  { name: 'Notifications', path: '/notifications', icon: Bell },
  { name: 'Saved', path: '/saved', icon: Bookmark },
  { name: 'Profile', path: '/profile', icon: UserRound, mobile: true },
];
