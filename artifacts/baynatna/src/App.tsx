import { ClerkProvider, SignIn, SignUp, useAuth, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import {
  useCreateDailyQuestion,
  useCreateGame,
  useCreateGameAnswer,
  useCreateGroup,
  useCreateMemory,
  useCreateMood,
  useCreateOrUpdateMe,
  useCreateQuestionAnswer,
  useGetDashboard,
  useGetDailyQuestion,
  useGetGame,
  useGetGroup,
  useGetMe,
  useJoinGroup,
  useListGames,
  useListGroupMembers,
  useListGroupMoods,
  useListGroups,
  useListMemories,
  useListQuestionAnswers,
  getGetDailyQuestionQueryKey,
  getGetGameQueryKey,
  getGetGroupQueryKey,
  getGetMeQueryKey,
  getListGamesQueryKey,
  getListGroupMembersQueryKey,
  getListGroupMoodsQueryKey,
  getListGroupsQueryKey,
  getListMemoriesQueryKey,
  getListQuestionAnswersQueryKey,
} from '@workspace/api-client-react';
import type {
  DailyQuestion,
  Game,
  Group,
  GroupMember,
  Memory,
  Mood,
  QuestionAnswer,
} from '@workspace/api-client-react';
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  CircleHelp,
  Copy,
  Flower2,
  Gamepad2,
  Heart,
  ImagePlus,
  Layers3,
  Lightbulb,
  Loader2,
  LogOut,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Send,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ButtonHTMLAttributes, ElementType, HTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  Link,
  Redirect,
  Route,
  Router as WouterRouter,
  Switch,
  useLocation,
  useParams,
} from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in the environment');
}

const moodOptions = ['Bright', 'Steady', 'Tender', 'Restless', 'Quiet'];
const warmColors = ['coral', 'teal', 'gold', 'plum', 'sage'];
const blockColors = ['bg-[#d4e5db]', 'bg-[#ead4df]', 'bg-[#f1dfbf]', 'bg-[#e7d4df]', 'bg-[#d9e4c9]'];

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

function initials(name?: string | null) {
  return (name || 'Friend')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function firstName(name?: string | null) {
  return (name || 'friend').split(' ')[0];
}

function formatDate(value?: string | null) {
  if (!value) return 'Today';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(value));
}

function timeAgo(value?: string | null) {
  if (!value) return 'a little while ago';
  const delta = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(delta / 60000);
  if (minutes < 2) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function Avatar({ name, color = 'teal', size = 'md' }: { name?: string | null; color?: string; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <div
      data-testid={`avatar-${(name || 'friend').replace(/\s+/g, '-').toLowerCase()}`}
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-semibold tracking-tight',
        size === 'sm' && 'h-8 w-8 text-[10px]',
        size === 'md' && 'h-10 w-10 text-xs',
        size === 'lg' && 'h-14 w-14 text-base',
        color === 'coral' && 'bg-[#f2a48f] text-[#593d37]',
        color === 'teal' && 'bg-[#a9d4c7] text-[#24594f]',
        color === 'gold' && 'bg-[#efcf91] text-[#604b23]',
        color === 'plum' && 'bg-[#d5b8c9] text-[#5d3e53]',
        color === 'sage' && 'bg-[#bfd1ad] text-[#3f5438]',
      )}
    >
      {initials(name)}
    </div>
  );
}

function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" data-testid="link-logo" className="group flex items-center gap-2.5">
      <span className={cn('relative flex h-9 w-9 items-center justify-center rounded-[13px] transition-transform group-hover:rotate-6', light ? 'bg-[#efcf91] text-[#214d45]' : 'bg-[#ed967f] text-[#214d45]')}>
        <Flower2 size={19} strokeWidth={2.3} />
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#f7eee0]" />
      </span>
      <span className={cn('serif text-[22px] font-semibold tracking-[-0.04em]', light ? 'text-[#f9f2e8]' : 'text-[#214d45]')}>baynatna</span>
    </Link>
  );
}

function Button({ children, variant = 'primary', className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'soft' | 'ghost' | 'outline' }) {
  return (
    <button
      {...props}
      className={cn(
        'inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ee987e] disabled:pointer-events-none disabled:opacity-50',
        variant === 'primary' && 'bg-[#245f54] text-[#fff8ef] shadow-[0_7px_16px_rgba(36,95,84,.18)] hover:-translate-y-0.5 hover:bg-[#1e5148]',
        variant === 'soft' && 'bg-[#f3dfbc] text-[#38554d] hover:-translate-y-0.5 hover:bg-[#edcf9e]',
        variant === 'outline' && 'border border-[#d9cdbb] bg-[#fffaf3] text-[#38554d] hover:border-[#8ebbb0] hover:bg-[#f5eee4]',
        variant === 'ghost' && 'text-[#526e66] hover:bg-[#e9e1d5] hover:text-[#245f54]',
        className,
      )}
    >
      {children}
    </button>
  );
}

function IconButton({ label, children, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      {...props}
      aria-label={label}
      data-testid={`button-${label.toLowerCase().replace(/\s+/g, '-')}`}
      className={cn('inline-flex h-10 w-10 items-center justify-center rounded-full text-[#567069] transition-colors hover:bg-[#e9e1d5] hover:text-[#245f54]', className)}
    >
      {children}
    </button>
  );
}

function Field({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; 'data-testid'?: string }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-[#38554d]">
      {label}
      <input
        {...props}
        data-testid={props['data-testid'] || `input-${label.toLowerCase().replace(/\s+/g, '-')}`}
        className="h-12 w-full rounded-2xl border border-[#d9cdbb] bg-[#fffaf3] px-4 text-[15px] font-normal text-[#214d45] outline-none transition focus:border-[#6ca596] focus:ring-4 focus:ring-[#acd3c7]/30"
      />
    </label>
  );
}

function Textarea({ label, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; 'data-testid'?: string }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-[#38554d]">
      {label}
      <textarea
        {...props}
        data-testid={props['data-testid'] || `textarea-${label.toLowerCase().replace(/\s+/g, '-')}`}
        className="min-h-28 w-full resize-none rounded-2xl border border-[#d9cdbb] bg-[#fffaf3] px-4 py-3 text-[15px] font-normal text-[#214d45] outline-none transition focus:border-[#6ca596] focus:ring-4 focus:ring-[#acd3c7]/30"
      />
    </label>
  );
}

function Card({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cn('shell-card rounded-[24px]', className)}>{children}</div>;
}

function SectionHeading({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="mono mb-1 text-[10px] font-medium uppercase tracking-[.16em] text-[#d17662]">{eyebrow}</p>}
        <h2 className="serif text-[26px] leading-tight tracking-[-.03em] text-[#214d45]">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function LoadingBlock({ lines = 3 }: { lines?: number }) {
  return (
    <div data-testid="status-loading" className="animate-pulse-soft space-y-3 rounded-[24px] border border-[#e0d5c6] bg-[#fffaf3] p-6">
      <div className="h-4 w-24 rounded-full bg-[#e8ddce]" />
      {Array.from({ length: lines }).map((_, index) => <div key={index} className={cn('h-3 rounded-full bg-[#eee4d6]', index === lines - 1 ? 'w-2/3' : 'w-full')} />)}
    </div>
  );
}

function ErrorBlock({ message = 'We could not bring that in right now.', retry }: { message?: string; retry?: () => void }) {
  return (
    <div data-testid="status-error" className="rounded-[24px] border border-[#e8b8a8] bg-[#fff4ee] p-6 text-[#71463c]">
      <div className="mb-2 flex items-center gap-2 font-semibold"><CircleHelp size={17} /> A small hiccup</div>
      <p className="text-sm">{message}</p>
      {retry && <Button onClick={retry} variant="outline" className="mt-4 min-h-9 px-3 text-xs">Try again</Button>}
    </div>
  );
}

function EmptyBlock({ icon: Icon, title, body, action }: { icon: ElementType; title: string; body: string; action?: ReactNode }) {
  return (
    <div data-testid="status-empty" className="flex flex-col items-center justify-center rounded-[24px] border border-dashed border-[#d7c9b8] bg-[#fcf6ec] px-6 py-10 text-center">
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f0ddba] text-[#9b674b]"><Icon size={22} /></span>
      <h3 className="serif text-xl text-[#38554d]">{title}</h3>
      <p className="mt-1 max-w-xs text-sm leading-6 text-[#718079]">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

function PublicWelcome() {
  return (
    <main className="paper-grain min-h-[100dvh] overflow-hidden bg-[#f5ecdf] text-[#214d45]">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 lg:px-10">
        <Logo />
        <div className="flex items-center gap-2">
          <Link href="/sign-in" data-testid="link-sign-in" className="rounded-full px-4 py-2.5 text-sm font-semibold text-[#526e66] transition hover:bg-[#e7dccd]">Sign in</Link>
          <Link href="/sign-up" data-testid="link-sign-up" className="rounded-full bg-[#245f54] px-4 py-2.5 text-sm font-semibold text-[#fff8ef] shadow-[0_7px_18px_rgba(36,95,84,.18)] transition hover:-translate-y-0.5">Make a space</Link>
        </div>
      </nav>
      <section className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-12 lg:grid-cols-[1.04fr_.96fr] lg:px-10 lg:pb-28 lg:pt-20">
        <div className="relative z-10 animate-rise">
          <p className="mono mb-5 flex items-center gap-2 text-[11px] uppercase tracking-[.2em] text-[#c36d59]"><span className="h-2 w-2 rounded-full bg-[#ef9a7f]" /> made for your people</p>
          <h1 className="serif max-w-xl text-[clamp(3.7rem,8vw,7rem)] leading-[.91] tracking-[-.065em] text-[#214d45]">A little<br /><span className="text-[#c56c58]">closer,</span> every day.</h1>
          <p className="mt-7 max-w-md text-lg leading-8 text-[#5c746c]">Baynatna is the small daily ritual for the friends you never want to lose in the scroll.</p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link href="/sign-up" data-testid="link-start-sharing" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#245f54] px-6 text-sm font-semibold text-[#fff8ef] shadow-[0_10px_22px_rgba(36,95,84,.2)] transition hover:-translate-y-1">Start sharing <ArrowRight size={17} /></Link>
            <span className="text-sm text-[#789087]">Private by design</span>
          </div>
        </div>
        <div className="relative mx-auto min-h-[410px] w-full max-w-[510px] animate-rise delay-2">
          <div className="absolute right-[4%] top-[3%] h-72 w-72 rounded-full bg-[#e7c178]/55 blur-[1px]" />
          <div className="absolute bottom-[2%] left-[3%] h-52 w-52 rounded-full bg-[#a8cfc1]/70" />
          <div className="absolute left-[11%] top-[12%] h-[310px] w-[340px] rotate-[-7deg] rounded-[34px] border border-[#ffffff]/70 bg-[#fff8ef]/80 p-5 shadow-[0_25px_60px_rgba(78,79,53,.14)] backdrop-blur-sm">
            <div className="flex items-center justify-between"><span className="mono text-[10px] uppercase tracking-[.15em] text-[#bd725e]">Tuesday · 09:14</span><MoreHorizontal size={17} className="text-[#789087]" /></div>
            <div className="mt-8 flex items-start gap-3"><Avatar name="Nour Haddad" color="coral" /><div><p className="text-sm font-semibold">Nour is feeling <span className="text-[#c56c58]">tender</span></p><p className="mt-1 text-xs text-[#718079]">“A slow morning, in the best way.”</p></div></div>
            <div className="mt-8 border-t border-[#e4d9ca] pt-4"><p className="mono text-[10px] uppercase tracking-[.13em] text-[#789087]">today’s question</p><p className="serif mt-2 text-2xl leading-tight text-[#38554d]">What tiny thing made you smile?</p><div className="mt-4 flex items-center gap-2"><span className="h-7 w-7 rounded-full bg-[#efcf91]" /><span className="h-7 w-7 rounded-full bg-[#b7d4c8]" /><span className="h-7 w-7 rounded-full bg-[#d5b8c9]" /><span className="text-xs text-[#718079]">+ 2 answers</span></div></div>
          </div>
          <div className="animate-drift absolute bottom-[3%] right-[3%] w-48 rotate-[8deg] rounded-[25px] bg-[#245f54] p-5 text-[#f9f2e8] shadow-[0_22px_36px_rgba(34,80,72,.2)]"><p className="mono text-[9px] uppercase tracking-[.16em] text-[#a9d4c7]">a shared memory</p><p className="serif mt-3 text-[25px] leading-[1.05]">The night we missed the last train.</p><p className="mt-5 text-xs text-[#b5d0c8]">Maya · 3 days ago</p></div>
        </div>
      </section>
      <section className="border-y border-[#dfd0bd] bg-[#eee1d0] px-6 py-10 lg:px-10">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
          {[
            ['01', 'Check in, gently', 'A mood is enough. Add a note when you want to let people a little further in.'],
            ['02', 'Ask the good questions', 'One daily prompt keeps the group curious about each other, even from far away.'],
            ['03', 'Keep the good bits', 'Turn passing moments into a shared shelf of memories you can return to.'],
          ].map(([number, title, body]) => <div key={number} className="animate-rise"><span className="mono text-xs text-[#c56c58]">{number}</span><h2 className="serif mt-4 text-2xl text-[#38554d]">{title}</h2><p className="mt-2 max-w-xs text-sm leading-6 text-[#718079]">{body}</p></div>)}
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-6 py-20 text-center lg:px-10 lg:py-28"><p className="mono text-[10px] uppercase tracking-[.2em] text-[#c56c58]">not another feed</p><h2 className="serif mx-auto mt-4 max-w-2xl text-4xl leading-tight tracking-[-.04em] text-[#214d45] md:text-6xl">Less keeping up.<br />More being there.</h2><Link href="/sign-up" data-testid="link-create-space-bottom" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[#c56c58] underline decoration-[#e7c178] decoration-2 underline-offset-8">Create your little corner <ArrowRight size={16} /></Link></section>
      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 border-t border-[#dfd0bd] px-6 py-8 text-xs text-[#789087] lg:px-10"><Logo /><span>For the group chat that means everything.</span></footer>
    </main>
  );
}

function AuthPage({ signUp = false }: { signUp?: boolean }) {
  return (
    <main className="paper-grain grid min-h-[100dvh] bg-[#f5ecdf] lg:grid-cols-[.9fr_1.1fr]">
      <div className="relative hidden overflow-hidden bg-[#245f54] p-10 lg:flex lg:flex-col lg:justify-between">
        <Logo light />
        <div className="relative z-10 max-w-md pb-10 text-[#f9f2e8]"><p className="mono text-[10px] uppercase tracking-[.2em] text-[#efcf91]">your people, in one place</p><h1 className="serif mt-5 text-6xl leading-[.94] tracking-[-.06em]">Small rituals.<br /><span className="text-[#ef9a7f]">Big feeling.</span></h1><p className="mt-6 max-w-sm text-base leading-7 text-[#b7d4c8]">A private home for the daily hellos, honest check-ins, and stories you’ll tell again.</p></div>
        <div className="absolute -bottom-20 -right-16 h-72 w-72 rounded-full border-[44px] border-[#efcf91]/25" /><div className="absolute right-14 top-32 h-16 w-16 rotate-12 rounded-[20px] border border-[#ef9a7f]/45" />
      </div>
      <div className="flex flex-col items-center justify-center px-6 py-10"><div className="mb-8 lg:hidden"><Logo /></div><div className="w-full max-w-[430px] rounded-[28px] border border-[#dfd0bd] bg-[#fffaf3] p-6 shadow-[0_18px_45px_rgba(89,75,52,.08)] sm:p-9">{signUp ? <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} fallbackRedirectUrl={`${basePath}/home`} /> : <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} fallbackRedirectUrl={`${basePath}/home`} />}</div><p className="mt-6 text-center text-xs text-[#789087]">Baynatna means “among us”. That’s the whole idea.</p></div>
    </main>
  );
}

function Sidebar({ group, mobileOpen, closeMobile }: { group?: Group | null; mobileOpen: boolean; closeMobile: () => void }) {
  const [location] = useLocation();
  const nav = [{ href: '/home', label: 'Today', icon: Flower2 }, { href: '/groups', label: 'Your groups', icon: Users }, { href: '/memories', label: 'Memories', icon: BookOpen }, { href: '/game', label: 'The game', icon: Gamepad2 }];
  return (
    <>
      {mobileOpen && <button aria-label="Close navigation" data-testid="button-close-navigation" onClick={closeMobile} className="fixed inset-0 z-30 bg-[#214d45]/35 md:hidden" />}
      <aside className={cn('fixed inset-y-0 left-0 z-40 flex w-[272px] flex-col bg-[#245f54] px-5 py-6 text-[#eff4e9] transition-transform duration-300 md:translate-x-0', mobileOpen ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex items-center justify-between"><Logo light /><IconButton label="Close navigation" onClick={closeMobile} className="text-[#b7d4c8] hover:bg-[#2d6b5f] md:hidden"><X size={18} /></IconButton></div>
        <div className="mt-12"><p className="mono px-3 text-[10px] uppercase tracking-[.17em] text-[#9fc9bb]">your corner</p>{group ? <Link href={`/groups/${group.id}`} onClick={closeMobile} data-testid="link-current-group" className="mt-3 flex items-center justify-between rounded-2xl bg-[#2d6c60] px-3 py-3 transition hover:bg-[#367668]"><span className="min-w-0"><span className="block truncate text-sm font-semibold">{group.name}</span><span className="mt-0.5 block text-xs text-[#b7d4c8]">{group.memberCount} people</span></span><ChevronDown size={16} className="text-[#b7d4c8]" /></Link> : <Link href="/groups" data-testid="link-choose-group" className="mt-3 block rounded-2xl border border-dashed border-[#72aa9d] px-3 py-3 text-sm text-[#cbe1d8]">Choose a group <ArrowRight size={14} className="ml-1 inline" /></Link>}</div>
        <nav className="mt-8 grid gap-1" aria-label="Main navigation">{nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={closeMobile} data-testid={`link-nav-${label.toLowerCase().replace(/\s+/g, '-')}`} className={cn('flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition', location === href ? 'bg-[#efcf91] text-[#24544b]' : 'text-[#c2ddd3] hover:bg-[#2d6c60] hover:text-[#eff4e9]')}><Icon size={18} strokeWidth={1.8} /><span>{label}</span>{label === 'Today' && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#ef9a7f]" />}</Link>)}</nav>
        <div className="mt-auto rounded-[22px] border border-[#4c887b] bg-[#2b685c] p-4"><div className="flex items-center gap-2 text-[#efcf91]"><Heart size={15} fill="currentColor" /><span className="text-xs font-semibold">Keep it small</span></div><p className="mt-2 text-xs leading-5 text-[#b7d4c8]">Baynatna works best with the people you’d call at midnight.</p></div>
        <div className="mt-5 flex items-center justify-between border-t border-[#4b887b] pt-4"><Link href="/profile" onClick={closeMobile} data-testid="link-sidebar-profile" className="flex items-center gap-2 text-sm text-[#cbe1d8]"><Avatar name="You" color="gold" size="sm" /><span>Your profile</span></Link><IconButton label="Sign out" className="text-[#b7d4c8] hover:bg-[#2d6c60]"><LogOut size={17} /></IconButton></div>
      </aside>
    </>
  );
}

function AppShell({ children, group }: { children: ReactNode; group?: Group | null }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return <div className="paper-grain min-h-[100dvh] bg-[#f5ecdf]"><Sidebar group={group} mobileOpen={mobileOpen} closeMobile={() => setMobileOpen(false)} /><div className="min-h-[100dvh] md:pl-[272px]"><header className="flex h-[76px] items-center justify-between border-b border-[#dfd0bd] px-5 md:px-10"><IconButton label="Open navigation" onClick={() => setMobileOpen(true)} className="md:hidden"><Menu size={20} /></IconButton><div className="hidden md:block"><p className="mono text-[10px] uppercase tracking-[.16em] text-[#a07965]">{formatDate(new Date().toISOString())}</p></div><div className="flex items-center gap-3"><span className="hidden text-right sm:block"><span className="block text-sm font-semibold text-[#38554d]">Good to see you</span><span className="block text-xs text-[#789087]">Your circle is here.</span></span><Avatar name="You" color="coral" /></div></header><main className="mx-auto max-w-[1240px] px-5 py-8 md:px-10 md:py-10">{children}</main></div></div>;
}

function MoodComposer({ groupId, current }: { groupId: string; current?: Mood | null }) {
  const qc = useQueryClient();
  const mutation = useCreateMood();
  const [selected, setSelected] = useState(current?.label || '');
  const [note, setNote] = useState(current?.note || '');
  const [shared, setShared] = useState(current?.shared ?? true);
  const save = () => mutation.mutate({ groupId, data: { emoji: selected.toLowerCase() || 'steady', label: selected || 'Steady', note, shared } }, { onSuccess: () => qc.invalidateQueries({ queryKey: getListGroupMoodsQueryKey(groupId) }) });
  return <Card className="overflow-hidden bg-[#fff8ef]"><div className="border-b border-[#e6dacb] bg-[#f2dfc1]/55 px-6 py-5"><div className="flex items-center justify-between"><div><p className="mono text-[10px] uppercase tracking-[.16em] text-[#c56c58]">your daily check-in</p><h2 className="serif mt-1 text-2xl text-[#38554d]">{current ? 'A little update?' : 'How are you arriving today?'}</h2></div><span className="rounded-full bg-[#fff8ef] px-3 py-1 text-xs text-[#9a806a]">{current ? 'saved' : '2 min ritual'}</span></div></div><div className="p-6"><p className="mb-3 text-sm font-semibold text-[#526e66]">Pick the closest word</p><div className="flex flex-wrap gap-2">{moodOptions.map((mood) => <button key={mood} type="button" data-testid={`button-mood-${mood.toLowerCase()}`} onClick={() => setSelected(mood)} className={cn('rounded-full border px-4 py-2 text-sm transition', selected === mood ? 'border-[#245f54] bg-[#245f54] text-[#fff8ef]' : 'border-[#dbcfbf] bg-[#fffaf3] text-[#60766e] hover:border-[#8bb9ae]')}>{mood}</button>)}</div><textarea value={note} onChange={(e) => setNote(e.target.value)} data-testid="textarea-mood-note" placeholder="A sentence, a fragment, or just leave this blank." className="mt-5 min-h-[82px] w-full resize-none rounded-2xl border border-[#d9cdbb] bg-[#fffaf3] px-4 py-3 text-sm text-[#38554d] outline-none placeholder:text-[#a59a8b] focus:border-[#6ca596] focus:ring-4 focus:ring-[#acd3c7]/30" /><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><label className="flex cursor-pointer items-center gap-2 text-xs text-[#718079]"><input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} data-testid="input-mood-shared" className="h-4 w-4 accent-[#245f54]" /> Share with the group</label><Button onClick={save} disabled={!selected || mutation.isPending} data-testid="button-save-mood">{mutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}{mutation.isPending ? 'Saving' : current ? 'Update mood' : 'Share mood'}</Button></div>{mutation.isError && <p data-testid="text-mood-error" className="mt-3 text-xs text-[#b25748]">That didn’t save. Please try once more.</p>}</div></Card>;
}

function MemberStrip({ members }: { members: GroupMember[] }) {
  if (!members.length) return <EmptyBlock icon={Users} title="Your people will be here" body="Invite a few friends to make this corner feel like yours." />;
  return <Card className="p-6"><div className="flex items-center justify-between"><p className="mono text-[10px] uppercase tracking-[.16em] text-[#c56c58]">the circle</p><span className="text-xs text-[#789087]">{members.length} members</span></div><div className="quiet-scroll mt-5 flex gap-5 overflow-x-auto pb-1">{members.map((member, index) => <div key={member.id} data-testid={`member-${member.id}`} className="min-w-[58px] text-center"><div className="relative mx-auto w-fit"><Avatar name={member.name} color={warmColors[index % warmColors.length]} size="md" />{member.currentMood && <span className="absolute -bottom-0.5 -right-1 h-3 w-3 rounded-full border-2 border-[#fffaf3] bg-[#ef9a7f]" />}</div><p className="mt-2 max-w-[68px] truncate text-xs font-medium text-[#526e66]">{firstName(member.name)}</p></div>)}</div></Card>;
}

function QuestionCard({ question, answers, groupId }: { question: DailyQuestion; answers: QuestionAnswer[]; groupId: string }) {
  const qc = useQueryClient();
  const mutation = useCreateQuestionAnswer();
  const [answer, setAnswer] = useState('');
  const submit = () => mutation.mutate({ questionId: question.id, data: { answer } }, { onSuccess: () => { setAnswer(''); qc.invalidateQueries({ queryKey: getListQuestionAnswersQueryKey(question.id) }); qc.invalidateQueries({ queryKey: getGetDailyQuestionQueryKey(groupId) }); } });
  return <Card className="overflow-hidden"><div className="bg-[#dcece5] px-6 py-6"><div className="flex items-center justify-between"><span className="flex items-center gap-2 text-xs font-semibold text-[#37665a]"><Lightbulb size={16} /> today’s question</span><span className="mono text-[10px] uppercase tracking-[.12em] text-[#678a7f]">{question.answerCount} answers</span></div><h2 data-testid="text-daily-question" className="serif mt-5 max-w-lg text-[30px] leading-tight tracking-[-.03em] text-[#24594f]">{question.prompt}</h2></div><div className="p-6"><div className="flex gap-2"><input value={answer} onChange={(e) => setAnswer(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && answer.trim() && submit()} data-testid="input-question-answer" placeholder="Write what comes to mind…" className="h-11 min-w-0 flex-1 rounded-full border border-[#d9cdbb] bg-[#fffaf3] px-4 text-sm outline-none focus:border-[#6ca596]" /><Button onClick={submit} disabled={!answer.trim() || mutation.isPending} data-testid="button-submit-answer" className="h-11 shrink-0 px-4">{mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}<span className="hidden sm:inline">Answer</span></Button></div>{answers.length > 0 && <div className="mt-5 space-y-3 border-t border-[#e6dacb] pt-4">{answers.slice(0, 3).map((item) => <div key={item.id} data-testid={`answer-${item.id}`} className="flex items-start gap-3"><Avatar name={item.userName} color="gold" size="sm" /><p className="min-w-0 text-sm leading-6 text-[#526e66]"><strong className="mr-1 text-[#38554d]">{firstName(item.userName)}</strong>{item.answer}</p></div>)}</div>}</div></Card>;
}

function QuestionMaker({ groupId }: { groupId: string }) {
  const qc = useQueryClient();
  const create = useCreateDailyQuestion();
  const [prompt, setPrompt] = useState('');
  const submit = () => create.mutate({ groupId, data: { prompt, date: new Date().toISOString() } }, { onSuccess: () => { setPrompt(''); qc.invalidateQueries({ queryKey: getGetDailyQuestionQueryKey(groupId) }); } });
  return <Card className="bg-[#dcece5] p-6"><div className="flex items-center gap-2 text-xs font-semibold text-[#37665a]"><Lightbulb size={16} /> today’s question</div><h2 className="serif mt-4 text-2xl text-[#24594f]">Give everyone something good to answer.</h2><div className="mt-5 flex gap-2"><input value={prompt} onChange={(e) => setPrompt(e.target.value)} data-testid="input-new-question" placeholder="What are you looking forward to?" className="h-11 min-w-0 flex-1 rounded-full border border-[#b9d5c8] bg-[#f5fbf4] px-4 text-sm outline-none focus:border-[#6ca596]" /><Button onClick={submit} disabled={!prompt.trim() || create.isPending} data-testid="button-create-question">{create.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Ask</Button></div>{create.isError && <p data-testid="text-question-error" className="mt-3 text-xs text-[#b25748]">The question stayed tucked away. Try again.</p>}</Card>;
}

function MemoryMini({ memory }: { memory: Memory }) {
  return <div data-testid={`memory-${memory.id}`} className="group rounded-[20px] border border-[#e2d7c7] bg-[#fffaf3] p-4 transition hover:-translate-y-1 hover:shadow-[0_10px_26px_rgba(89,75,52,.08)]"><div className={cn('mb-4 flex h-24 items-end rounded-2xl p-3', memory.type === 'photo' ? 'bg-[#d4e5db]' : memory.type === 'moment' ? 'bg-[#f2d7b7]' : 'bg-[#e7d4df]')}><span className="mono text-[9px] uppercase tracking-[.14em] text-[#657b70]">{memory.type}</span></div><h3 className="serif line-clamp-2 text-lg leading-tight text-[#38554d]">{memory.title}</h3><p className="mt-2 text-xs text-[#8a978e]">{memory.authorName} · {timeAgo(memory.createdAt)}</p></div>;
}

function GameMini({ game }: { game: Game }) {
  return <Card className="relative overflow-hidden bg-[#e9d7e0] p-6"><div className="absolute -right-8 -top-10 h-36 w-36 rounded-full border-[22px] border-[#c89ab4]/50" /><div className="relative"><div className="flex items-center justify-between"><span className="flex items-center gap-2 text-xs font-semibold text-[#754f68]"><Gamepad2 size={16} /> the group game</span><span className="rounded-full bg-[#f8edf1] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#8c627d]">{game.status}</span></div><h2 className="serif mt-5 text-3xl leading-none text-[#5d3e53]">{game.title}</h2><p className="mt-3 max-w-xs text-sm leading-6 text-[#785e70]">{game.prompt}</p><Link href="/game" data-testid="link-play-game" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#754f68] px-4 py-2.5 text-sm font-semibold text-[#fff8ef] transition hover:-translate-y-0.5">Play a round <ArrowRight size={15} /></Link></div></Card>;
}

function Dashboard() {
  const { data, isLoading, isError, refetch } = useGetDashboard();
  if (isLoading) return <AppShell><div className="space-y-5"><LoadingBlock /><div className="grid gap-5 lg:grid-cols-2"><LoadingBlock /><LoadingBlock /></div></div></AppShell>;
  if (isError || !data) return <AppShell><ErrorBlock retry={() => refetch()} /></AppShell>;
  const group = data.selectedGroup;
  return <AppShell group={group}><div className="animate-rise"><div className="mb-9 flex flex-wrap items-end justify-between gap-4"><div><p className="mono text-[10px] uppercase tracking-[.18em] text-[#c56c58]">a fresh page in the story</p><h1 data-testid="text-dashboard-greeting" className="serif mt-2 text-[clamp(2.7rem,5vw,4.5rem)] leading-none tracking-[-.055em] text-[#214d45]">Hello, {firstName(data.user.name)}.</h1><p className="mt-3 text-base text-[#718079]">Here’s what your people are carrying today.</p></div><Link href="/groups" data-testid="link-dashboard-groups" className="inline-flex items-center gap-2 rounded-full border border-[#d9cdbb] bg-[#fffaf3] px-4 py-2.5 text-sm font-semibold text-[#526e66] transition hover:border-[#8ebbb0]"><Users size={16} /> {group ? 'Manage circles' : 'Find your circle'}</Link></div>{!group ? <Card className="p-8"><EmptyBlock icon={Users} title="Your corner is waiting" body="Create a private group or join one with an invite code. The good stuff starts here." action={<Link href="/groups" data-testid="link-create-first-group" className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#245f54] px-4 text-sm font-semibold text-[#fff8ef]">Set up your circle <ArrowRight size={15} /></Link>} /></Card> : <><div className="grid gap-5 xl:grid-cols-[1.04fr_.96fr]"><MoodComposer groupId={group.id} current={data.todayMood} /><QuestionCard question={data.question || { id: 'empty', groupId: group.id, prompt: 'What is one small thing you want to remember from today?', date: new Date().toISOString(), answerCount: 0 }} answers={data.recentAnswers || []} groupId={group.id} /></div><div className="mt-5"><MemberStrip members={data.members || []} /></div><div className="mt-10 grid gap-5 lg:grid-cols-[1.04fr_.96fr]"><section><SectionHeading eyebrow="kept close" title="Recent memories" action={<Link href="/memories" data-testid="link-view-memories" className="text-xs font-semibold text-[#c56c58]">See all <ArrowRight size={13} className="ml-1 inline" /></Link>} />{data.latestMemories?.length ? <div className="grid gap-3 sm:grid-cols-2">{data.latestMemories.slice(0, 4).map((memory) => <MemoryMini key={memory.id} memory={memory} />)}</div> : <EmptyBlock icon={BookOpen} title="Nothing tucked away yet" body="Save the first little moment your group will want to remember." />}</section><section><SectionHeading eyebrow="play together" title="A little friendly rivalry" />{data.activeGame ? <GameMini game={data.activeGame} /> : <EmptyBlock icon={Gamepad2} title="The game is sleeping" body="Start a round and find out who has been paying attention." action={<Link href="/game" data-testid="link-start-game" className="text-sm font-semibold text-[#c56c58]">Start a round <ArrowRight size={14} className="ml-1 inline" /></Link>} />}</section></div></>}</div></AppShell>;
}

function GroupsPage() {
  const qc = useQueryClient();
  const { data: groups, isLoading, isError, refetch } = useListGroups();
  const create = useCreateGroup();
  const join = useJoinGroup();
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [notice, setNotice] = useState('');
  const createSubmit = () => create.mutate({ data: { name, description } }, { onSuccess: (group) => { setNotice(`Your circle “${group.name}” is ready.`); setName(''); setDescription(''); qc.invalidateQueries({ queryKey: getListGroupsQueryKey() }); } });
  const joinSubmit = () => join.mutate({ data: { inviteCode } }, { onSuccess: (group) => { setNotice(`You joined ${group.name}.`); setInviteCode(''); qc.invalidateQueries({ queryKey: getListGroupsQueryKey() }); } });
  return <AppShell><div className="animate-rise"><div className="mb-9"><p className="mono text-[10px] uppercase tracking-[.18em] text-[#c56c58]">your people</p><h1 className="serif mt-2 text-5xl tracking-[-.055em] text-[#214d45]">Your circles.</h1><p className="mt-3 max-w-lg text-[#718079]">A few people, one private place, no pressure to perform.</p></div><div className="grid gap-6 xl:grid-cols-[.8fr_1.2fr]"><Card className="p-6 sm:p-8"><div className="flex rounded-full bg-[#eee3d4] p-1"><button type="button" data-testid="button-mode-create" onClick={() => setMode('create')} className={cn('flex-1 rounded-full py-2.5 text-sm font-semibold transition', mode === 'create' ? 'bg-[#fffaf3] text-[#245f54] shadow-sm' : 'text-[#789087]')}>Create a circle</button><button type="button" data-testid="button-mode-join" onClick={() => setMode('join')} className={cn('flex-1 rounded-full py-2.5 text-sm font-semibold transition', mode === 'join' ? 'bg-[#fffaf3] text-[#245f54] shadow-sm' : 'text-[#789087]')}>Join with code</button></div>{mode === 'create' ? <div className="mt-7 space-y-5"><Field label="Circle name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Sunday people" /><Textarea label="A little description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What makes this group yours?" /><Button onClick={createSubmit} disabled={!name.trim() || create.isPending} data-testid="button-create-group" className="w-full">{create.isPending ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />} Create circle</Button></div> : <div className="mt-7 space-y-5"><div className="rounded-2xl bg-[#e5f0eb] p-4 text-sm leading-6 text-[#54746b]">Ask a friend for the invite code from their circle. It’s short, private, and only works once.</div><Field label="Invite code" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} placeholder="e.g. MOSS-48" autoCapitalize="characters" /><Button onClick={joinSubmit} disabled={inviteCode.trim().length < 4 || join.isPending} data-testid="button-join-group" className="w-full">{join.isPending ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />} Join circle</Button></div>}{(create.isError || join.isError) && <p data-testid="text-group-error" className="mt-4 text-sm text-[#b25748]">That didn’t work. Check the details and try again.</p>}{notice && <div data-testid="status-group-success" className="mt-4 flex items-center gap-2 rounded-2xl bg-[#e2f0e9] p-3 text-sm text-[#37665a]"><Check size={16} />{notice}</div>}</Card><div>{isLoading ? <LoadingBlock lines={4} /> : isError ? <ErrorBlock retry={() => refetch()} /> : groups?.length ? <div className="grid gap-3">{groups.map((group, index) => <Link key={group.id} href={`/groups/${group.id}`} data-testid={`card-group-${group.id}`} className="hover-lift group flex items-center justify-between rounded-[22px] border border-[#e2d7c7] bg-[#fffaf3] p-5"><div className="flex min-w-0 items-center gap-4"><span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl', blockColors[index % blockColors.length])}><Layers3 size={20} className="text-[#557169]" /></span><div className="min-w-0"><h2 className="serif truncate text-2xl text-[#38554d]">{group.name}</h2><p className="mt-1 truncate text-sm text-[#789087]">{group.description || 'Your private corner'}</p></div></div><div className="ml-4 flex shrink-0 items-center gap-3 text-right"><span className="hidden text-xs text-[#8a978e] sm:block">{group.memberCount} people</span><ArrowRight size={18} className="text-[#c56c58] transition group-hover:translate-x-1" /></div></Link>)}</div> : <EmptyBlock icon={Users} title="No circles yet" body="Create one above, or ask a friend for an invite code." />}</div></div></div></AppShell>;
}

function GroupPage() {
  const { groupId = '' } = useParams<{ groupId: string }>();
  const { data: group, isLoading: groupLoading, isError: groupError } = useGetGroup(groupId, { query: { queryKey: getGetGroupQueryKey(groupId), enabled: Boolean(groupId) } });
  const members = useListGroupMembers(groupId, { query: { queryKey: getListGroupMembersQueryKey(groupId), enabled: Boolean(groupId) } });
  const moods = useListGroupMoods(groupId, { query: { queryKey: getListGroupMoodsQueryKey(groupId), enabled: Boolean(groupId) } });
  const question = useGetDailyQuestion(groupId, { query: { queryKey: getGetDailyQuestionQueryKey(groupId), enabled: Boolean(groupId) } });
  const games = useListGames(groupId, { query: { queryKey: getListGamesQueryKey(groupId), enabled: Boolean(groupId) } });
  const memories = useListMemories(groupId, { query: { queryKey: getListMemoriesQueryKey(groupId), enabled: Boolean(groupId) } });
  if (groupLoading) return <AppShell><LoadingBlock lines={5} /></AppShell>;
  if (groupError || !group) return <AppShell><ErrorBlock message="We couldn’t open this circle." /></AppShell>;
  return <AppShell group={group}><div className="animate-rise"><Link href="/groups" data-testid="link-back-groups" className="text-xs font-semibold text-[#c56c58]">← All circles</Link><div className="mt-5 flex flex-wrap items-end justify-between gap-4"><div><p className="mono text-[10px] uppercase tracking-[.18em] text-[#c56c58]">the circle</p><h1 data-testid="text-group-name" className="serif mt-2 text-5xl tracking-[-.055em] text-[#214d45]">{group.name}</h1><p className="mt-3 max-w-xl text-[#718079]">{group.description || 'A private corner for the people who make ordinary days feel like something.'}</p></div><div className="rounded-2xl bg-[#f1dfbf] px-4 py-3"><p className="mono text-[9px] uppercase tracking-[.13em] text-[#9a806a]">invite code</p><button type="button" data-testid="button-copy-invite-code" onClick={() => navigator.clipboard?.writeText(group.inviteCode)} className="mt-1 flex items-center gap-2 font-mono text-sm font-medium text-[#5e5b3d]">{group.inviteCode}<Copy size={14} /></button></div></div><div className="mt-9 grid gap-5 lg:grid-cols-[.85fr_1.15fr]"><MemberStrip members={members.data || []} />{question.data ? <QuestionCard question={question.data} answers={[]} groupId={group.id} /> : <QuestionMaker groupId={group.id} />}</div><div className="mt-10 grid gap-5 lg:grid-cols-2"><section><SectionHeading eyebrow="in the moment" title="Moodboard" />{moods.isLoading ? <LoadingBlock /> : moods.data?.length ? <div className="space-y-2">{moods.data.slice(0, 6).map((mood, index) => <div key={mood.id} data-testid={`mood-${mood.id}`} className="flex items-center justify-between rounded-2xl border border-[#e2d7c7] bg-[#fffaf3] px-4 py-3"><div className="flex min-w-0 items-center gap-3"><Avatar name={mood.userName} color={warmColors[index % warmColors.length]} size="sm" /><div className="min-w-0"><p className="text-sm font-semibold text-[#38554d]">{mood.userName}</p>{mood.note && <p className="truncate text-xs text-[#789087]">{mood.note}</p>}</div></div><span className="rounded-full bg-[#e9f0e9] px-3 py-1 text-xs font-medium text-[#4f7569]">{mood.label}</span></div>)}</div> : <EmptyBlock icon={Heart} title="A quiet moodboard" body="Your group’s check-ins will gather here." />}</section><section><SectionHeading eyebrow="kept close" title="Latest memories" action={<Link href="/memories" data-testid="link-group-memories" className="text-xs font-semibold text-[#c56c58]">Open shelf <ArrowRight size={13} className="ml-1 inline" /></Link>} />{memories.data?.length ? <div className="grid gap-3 sm:grid-cols-2">{memories.data.slice(0, 4).map((memory) => <MemoryMini key={memory.id} memory={memory} />)}</div> : <EmptyBlock icon={BookOpen} title="Start the shelf" body="Save the moments you want this group to keep." />}</section></div><div className="mt-10"><SectionHeading eyebrow="friendly competition" title="Who knows me best?" action={<Link href="/game" data-testid="link-group-game" className="text-xs font-semibold text-[#c56c58]">Open game <ArrowRight size={13} className="ml-1 inline" /></Link>} />{games.data?.[0] ? <GameMini game={games.data[0]} /> : <EmptyBlock icon={Gamepad2} title="No round in play" body="Start a game when you’re ready for a little bragging rights." />}</div></div></AppShell>;
}

function MemoriesPage() {
  const { data: dashboard } = useGetDashboard();
  const groupId = dashboard?.selectedGroup?.id || '';
  const memories = useListMemories(groupId, { query: { queryKey: getListMemoriesQueryKey(groupId), enabled: Boolean(groupId) } });
  const qc = useQueryClient();
  const create = useCreateMemory();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState<'note' | 'moment' | 'photo'>('note');
  const submit = () => create.mutate({ groupId, data: { title, body, type } }, { onSuccess: () => { setOpen(false); setTitle(''); setBody(''); qc.invalidateQueries({ queryKey: getListMemoriesQueryKey(groupId) }); } });
  if (!groupId) return <AppShell><EmptyBlock icon={BookOpen} title="Choose a circle first" body="Your memory shelf belongs to a group. Pick one to see what you’ve kept." action={<Link href="/groups" data-testid="link-memories-groups" className="text-sm font-semibold text-[#c56c58]">Find your circle <ArrowRight size={14} className="ml-1 inline" /></Link>} /></AppShell>;
  return <AppShell group={dashboard?.selectedGroup}><div className="animate-rise"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="mono text-[10px] uppercase tracking-[.18em] text-[#c56c58]">the good bits</p><h1 className="serif mt-2 text-5xl tracking-[-.055em] text-[#214d45]">Memory shelf.</h1><p className="mt-3 text-[#718079]">A soft place for the things worth keeping.</p></div><Button onClick={() => setOpen((value) => !value)} data-testid="button-add-memory"><Plus size={17} /> Add a memory</Button></div>{open && <Card className="mt-6 animate-rise p-6"><div className="flex items-center justify-between"><h2 className="serif text-2xl text-[#38554d]">Tuck something away</h2><IconButton label="Close memory form" onClick={() => setOpen(false)}><X size={17} /></IconButton></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="The rainy-day walk" /><label className="grid gap-2 text-sm font-semibold text-[#38554d]">Type<select value={type} onChange={(e) => setType(e.target.value as 'note' | 'moment' | 'photo')} data-testid="select-memory-type" className="h-12 rounded-2xl border border-[#d9cdbb] bg-[#fffaf3] px-4 text-sm font-normal outline-none"><option value="note">Note</option><option value="moment">Moment</option><option value="photo">Photo</option></select></label></div><Textarea label="A few words (optional)" value={body} onChange={(e) => setBody(e.target.value)} placeholder="What should future-you remember?" /><div className="mt-4 flex justify-end"><Button onClick={submit} disabled={!title.trim() || create.isPending} data-testid="button-save-memory">{create.isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save memory</Button></div></Card>}{memories.isLoading ? <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><LoadingBlock /><LoadingBlock /><LoadingBlock /></div> : memories.isError ? <div className="mt-7"><ErrorBlock /></div> : memories.data?.length ? <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{memories.data.map((memory) => <MemoryMini key={memory.id} memory={memory} />)}</div> : <div className="mt-8"><EmptyBlock icon={ImagePlus} title="The shelf is still bare" body="The best memories are usually tiny. Add one before the day gets away." /></div>}</div></AppShell>;
}

function GamePage() {
  const { data: dashboard } = useGetDashboard();
  const groupId = dashboard?.selectedGroup?.id || '';
  const games = useListGames(groupId, { query: { queryKey: getListGamesQueryKey(groupId), enabled: Boolean(groupId) } });
  const active = games.data?.find((game) => game.status === 'active') || games.data?.[0];
  const game = useGetGame(active?.id || '', { query: { queryKey: getGetGameQueryKey(active?.id || ''), enabled: Boolean(active?.id) } });
  const create = useCreateGame();
  const answerMutation = useCreateGameAnswer();
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [answer, setAnswer] = useState('');
  const [created, setCreated] = useState(false);
  const start = () => create.mutate({ groupId, data: { title: title || 'Who knows me best?' } }, { onSuccess: () => { setCreated(true); setTitle(''); qc.invalidateQueries({ queryKey: getListGamesQueryKey(groupId) }); } });
  const answerQuestion = () => active && answerMutation.mutate({ gameId: active.id, data: { answer } }, { onSuccess: () => { setAnswer(''); qc.invalidateQueries({ queryKey: getGetGameQueryKey(active.id) }); } });
  if (!groupId) return <AppShell><EmptyBlock icon={Gamepad2} title="Choose a circle first" body="The game is made for a group. Pick your people, then come back here." action={<Link href="/groups" data-testid="link-game-groups" className="text-sm font-semibold text-[#c56c58]">Find your circle <ArrowRight size={14} className="ml-1 inline" /></Link>} /></AppShell>;
  return <AppShell group={dashboard?.selectedGroup}><div className="animate-rise"><div className="mb-9"><p className="mono text-[10px] uppercase tracking-[.18em] text-[#c56c58]">a little friendly rivalry</p><h1 className="serif mt-2 text-5xl tracking-[-.055em] text-[#214d45]">Who knows me best?</h1><p className="mt-3 max-w-lg text-[#718079]">A low-stakes way to discover who really listens when you’re telling a story.</p></div>{created && <div data-testid="status-game-success" className="mb-5 flex items-center gap-2 rounded-2xl bg-[#e2f0e9] p-3 text-sm text-[#37665a]"><Check size={16} /> A new round is ready for your circle.</div>}{!active ? <Card className="mx-auto max-w-2xl p-7 sm:p-10"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#ead4df] text-[#754f68]"><Gamepad2 size={28} /></div><h2 className="serif mt-6 text-center text-3xl text-[#5d3e53]">Start the first round</h2><p className="mx-auto mt-3 max-w-md text-center text-sm leading-6 text-[#785e70]">Give it a name, then ask the group a question only your people could answer.</p><div className="mx-auto mt-7 flex max-w-md gap-2"><input value={title} onChange={(e) => setTitle(e.target.value)} data-testid="input-game-title" placeholder="The summer edition" className="h-11 min-w-0 flex-1 rounded-full border border-[#d9cdbb] bg-[#fffaf3] px-4 text-sm outline-none focus:border-[#6ca596]" /><Button onClick={start} disabled={create.isPending} data-testid="button-create-game">{create.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Start</Button></div></Card> : <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]"><Card className="overflow-hidden"><div className="bg-[#ead4df] p-7 sm:p-10"><div className="flex items-center justify-between"><span className="mono text-[10px] uppercase tracking-[.16em] text-[#8c627d]">current round</span><span className="rounded-full bg-[#f8edf1] px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#8c627d]">{active.status}</span></div><h2 data-testid="text-game-title" className="serif mt-5 text-4xl leading-none text-[#5d3e53]">{active.title}</h2><p className="mt-5 max-w-lg text-lg leading-8 text-[#785e70]">{active.prompt}</p></div><div className="p-7 sm:p-10"><p className="text-sm font-semibold text-[#526e66]">Your answer</p><div className="mt-3 flex gap-2"><input value={answer} onChange={(e) => setAnswer(e.target.value)} data-testid="input-game-answer" placeholder="What do you think?" className="h-11 min-w-0 flex-1 rounded-full border border-[#d9cdbb] bg-[#fffaf3] px-4 text-sm outline-none focus:border-[#6ca596]" /><Button onClick={answerQuestion} disabled={!answer.trim() || answerMutation.isPending} data-testid="button-submit-game-answer"><Send size={15} /></Button></div>{game.isLoading ? <div className="mt-6"><LoadingBlock lines={2} /></div> : game.data && <div className="mt-6 border-t border-[#e6dacb] pt-5"><p className="mono text-[10px] uppercase tracking-[.15em] text-[#789087]">round notes</p><p className="mt-2 text-sm text-[#718079]">{active.questionCount || 0} questions asked so far. Keep going.</p></div>}</div></Card><Card className="h-fit bg-[#e4f0e8] p-7"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#b6d5c5] text-[#37665a]"><Sparkles size={21} /></span><h2 className="serif mt-5 text-3xl text-[#37665a]">The rules are simple.</h2><ol className="mt-5 space-y-4 text-sm leading-6 text-[#59776d]"><li className="flex gap-3"><span className="mono text-xs text-[#c56c58]">01</span>Someone asks the question.</li><li className="flex gap-3"><span className="mono text-xs text-[#c56c58]">02</span>Everyone answers honestly.</li><li className="flex gap-3"><span className="mono text-xs text-[#c56c58]">03</span>The person who knows you best gets to be insufferable.</li></ol></Card></div>}</div></AppShell>;
}

function ProfilePage() {
  const { data: user, isLoading, isError } = useGetMe();
  const qc = useQueryClient();
  const update = useCreateOrUpdateMe();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  useEffect(() => { if (user) { setName(user.name); setEmail(user.email); } }, [user]);
  if (isLoading) return <AppShell><LoadingBlock lines={4} /></AppShell>;
  if (isError || !user) return <AppShell><ErrorBlock /></AppShell>;
  const save = () => update.mutate({ data: { name, email, avatarUrl: user.avatarUrl } }, { onSuccess: () => qc.invalidateQueries({ queryKey: getGetMeQueryKey() }) });
  return <AppShell><div className="animate-rise max-w-2xl"><p className="mono text-[10px] uppercase tracking-[.18em] text-[#c56c58]">a little about you</p><h1 className="serif mt-2 text-5xl tracking-[-.055em] text-[#214d45]">Your profile.</h1><p className="mt-3 text-[#718079]">This is how you’ll show up in your people’s circles.</p><Card className="mt-8 p-6 sm:p-8"><div className="flex items-center gap-4 border-b border-[#e6dacb] pb-6"><Avatar name={user.name} color="coral" size="lg" /><div><h2 data-testid="text-profile-name" className="serif text-2xl text-[#38554d]">{user.name}</h2><p className="text-sm text-[#789087]">Joined {formatDate(user.joinedAt)}</p></div></div><div className="mt-6 grid gap-5"><Field label="Name" value={name} onChange={(e) => setName(e.target.value)} data-testid="input-profile-name" /><Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="input-profile-email" /></div><div className="mt-6 flex items-center justify-between gap-3"><p className="text-xs text-[#8a978e]">Your email is only used for your account.</p><Button onClick={save} disabled={!name.trim() || update.isPending} data-testid="button-save-profile">{update.isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save changes</Button></div>{update.isSuccess && <p data-testid="status-profile-success" className="mt-4 text-sm text-[#37665a]">Your profile is up to date.</p>}</Card></div></AppShell>;
}

function ClerkProfileBridge() {
  const { user, isLoaded } = useUser();
  const sync = useCreateOrUpdateMe();
  const syncedUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !user || syncedUserId.current === user.id || sync.isPending) {
      return;
    }
    const email = user.primaryEmailAddress?.emailAddress;
    sync.mutate(
      {
        data: {
          name: user.fullName || user.firstName || 'Baynatna user',
          email: email || `${user.id}@baynatna.local`,
          avatarUrl: user.imageUrl || null,
        },
      },
      { onSuccess: () => { syncedUserId.current = user.id; } },
    );
  }, [isLoaded, sync, user]);

  return null;
}

function SignedInRoutes() {
  const [location, setLocation] = useLocation();
  const { isLoaded, isSignedIn } = useAuth();
  useEffect(() => { if (isLoaded && !isSignedIn && location !== '/' && !location.startsWith('/sign-in') && !location.startsWith('/sign-up')) setLocation('/'); }, [isLoaded, isSignedIn, location, setLocation]);
  if (!isLoaded) return <div className="flex min-h-[100dvh] items-center justify-center bg-[#f5ecdf]"><div className="h-10 w-10 animate-pulse-soft rounded-2xl bg-[#d3e5dc]" /></div>;
  if (!isSignedIn) return <Switch><Route path="/sign-in/*?" component={() => <AuthPage />} /><Route path="/sign-up/*?" component={() => <AuthPage signUp />} /><Route path="/" component={PublicWelcome} /><Route component={PublicWelcome} /></Switch>;
  return <Switch><Route path="/" component={() => <Redirect to="/home" />} /><Route path="/sign-in" component={() => <Redirect to="/home" />} /><Route path="/sign-up" component={() => <Redirect to="/home" />} /><Route path="/home" component={Dashboard} /><Route path="/groups" component={GroupsPage} /><Route path="/groups/:groupId" component={GroupPage} /><Route path="/memories" component={MemoriesPage} /><Route path="/game" component={GamePage} /><Route path="/profile" component={ProfilePage} /><Route component={NotFound} /></Switch>;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={{
        theme: shadcn,
        cssLayerName: 'clerk',
        options: {
          logoPlacement: 'inside',
          logoLinkUrl: basePath || '/',
          logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
        },
        variables: {
          colorPrimary: '#245f54',
          colorForeground: '#214d45',
          colorMutedForeground: '#718079',
          colorBackground: '#fffaf3',
          colorInput: '#fffaf3',
          colorInputForeground: '#214d45',
          colorNeutral: '#d9cdbb',
          fontFamily: 'DM Sans, sans-serif',
          borderRadius: '1rem',
        },
      }}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
      localization={{
        signIn: { start: { title: 'أهلاً بعودتك', subtitle: 'سجّل الدخول إلى حسابك' } },
        signUp: { start: { title: 'أنشئ حسابك', subtitle: 'ابدأ مساحتك مع أصدقائك' } },
      }}
    >
      <ClerkProfileBridge />
      <SignedInRoutes />
    </ClerkProvider>
  );
}

function stripBase(path: string) {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || '/'
    : path;
}

function App() {
  return <QueryClientProvider client={queryClient}><ErrorBoundary><WouterRouter base={basePath}><ClerkProviderWithRoutes /></WouterRouter></ErrorBoundary></QueryClientProvider>;
}

export default App;