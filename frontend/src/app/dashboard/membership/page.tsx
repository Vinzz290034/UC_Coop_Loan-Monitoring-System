import { redirect } from 'next/navigation';

export default function MembershipRedirectPage() {
  redirect('/dashboard/members');
}
