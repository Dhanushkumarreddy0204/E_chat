import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, CircleAlert, Compass, Grid2X2, Search, Users } from 'lucide-react';
import { postsApi } from '../api/posts';
import { usersApi } from '../api/users';
import { Avatar } from '../components/common/Avatar';
import { PageSkeleton, PageState } from '../components/common/PageState';
import { PostGrid } from '../components/profile/PostGrid';
import { CommentsModal } from '../components/feed/CommentsModal';

export function ExplorePage() {
  const [params, setParams] = useSearchParams();
  const urlQuery = params.get('q') || '';
  const urlTab = params.get('tab') === 'people' ? 'people' : 'posts';
  const [query, setQuery] = useState(urlQuery);
  const [tab, setTab] = useState(urlTab);
  const [posts, setPosts] = useState(null);
  const [people, setPeople] = useState(null);
  const [postsError, setPostsError] = useState(false);
  const [peopleError, setPeopleError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [activePost, setActivePost] = useState(null);

  useEffect(() => {
    setQuery(urlQuery);
    setTab(urlTab);
  }, [urlQuery, urlTab]);

  useEffect(() => {
    let active = true;
    setPostsError(false);
    postsApi.getExplore(1, 60).then(data => { if (active) setPosts(data.items); })
      .catch(() => { if (active) setPostsError(true); });
    return () => { active = false; };
  }, [retry]);

  useEffect(() => {
    if (tab !== 'people') return;
    let active = true;
    setPeopleError(false);
    setPeople(null);
    const term = query.trim().replace(/^#/, '');
    const timer = setTimeout(() => {
      (term ? usersApi.searchUsers(term) : usersApi.getSuggestions(16))
        .then(data => { if (active) setPeople(data); })
        .catch(() => { if (active) setPeopleError(true); });
    }, term ? 260 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [tab, query, retry]);

  function submitSearch(event) {
    event.preventDefault();
    const next = new URLSearchParams();
    if (query.trim()) next.set('q', query.trim());
    if (tab === 'people') next.set('tab', tab);
    setParams(next, { replace: true });
  }

  const term = query.trim().toLowerCase();
  const filteredPosts = !term ? posts : posts?.filter(post => {
    const tags = post.tags || [];
    if (term.startsWith('#')) return tags.some(tag => tag.toLowerCase().replace(/^#/, '') === term.slice(1));
    return [post.caption, post.location, post.user?.full_name, post.user?.username, ...tags]
      .some(value => value?.toLowerCase().includes(term));
  });
  const items = tab === 'people' ? people : filteredPosts;
  const error = tab === 'people' ? peopleError : postsError;
  return (
    <div className="page-stack">
      <div className="space-y-2">
        <h1 className="page-title">Explore</h1>
        <p className="text-sm text-text-secondary">Find people, posts, and topics.</p>
      </div>
      <div className="panel space-y-3 p-4 sm:p-5">
        <form className="relative" role="search" onSubmit={submitSearch}>
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-400" />
          <input aria-label="Search people or posts" value={query} onChange={event => setQuery(event.target.value)}
            className="field !pl-10" placeholder={tab === 'people' ? 'Search for people' : 'Search recent posts or #topics'} />
        </form>
        <div className="flex gap-2" aria-label="Search category">
          {[['posts', 'Posts', Grid2X2], ['people', 'People', Users]].map(([value, label, Icon]) =>
            <button key={value} type="button" onClick={() => setTab(value)} aria-pressed={value === tab}
              className={`pill-button ${value === tab ? 'primary-button' : 'secondary-button'}`}><Icon size={16} />{label}</button>)}
        </div>
      </div>
      {error ? <PageState icon={CircleAlert} title="Could not load results" action="Retry" onAction={() => setRetry(value => value + 1)} /> :
        !items ? <PageSkeleton label="Finding results" media /> :
        !items.length ? <PageState icon={Compass} title={query ? 'No matches yet' : tab === 'people' ? 'No suggestions yet' : 'No posts yet'}
          description={query ? 'Try another name, keyword, or topic.' : undefined} /> :
        tab === 'people' ? <div className="grid gap-3 sm:grid-cols-2">
          {people.map(person => <Link key={person.id} to={`/profile/${person.username}`} className="panel flex min-w-0 items-center gap-3 p-4 hover:bg-brand-50">
            <Avatar src={person.avatar_url} alt={person.full_name} className="shrink-0" />
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{person.full_name}</p><p className="truncate text-xs text-text-secondary">@{person.username}</p></div>
            <ArrowUpRight size={17} className="shrink-0 text-brand-400" />
          </Link>)}
        </div> : <PostGrid posts={filteredPosts} onPostClick={setActivePost} />}
      {activePost && <CommentsModal isOpen post={activePost} onClose={() => setActivePost(null)} />}
    </div>
  );
}
