import React, { useState, useMemo, useEffect } from 'react';
import { MapPin, ChevronDown, Search, SlidersHorizontal, ArrowRight, Heart, Footprints, Palette, Gamepad2, Coffee, Utensils, Clock, Users, Flame, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useActivity } from '../context/ActivityContext';

// Icon mapping for known categories
const iconMap: Record<string, React.ReactNode> = {
  '城市徒步': <Footprints size={20} />,
  '城市漫步': <Footprints size={20} />,
  '手作体验': <Palette size={20} />,
  '工作坊': <Palette size={20} />,
  '桌游局': <Gamepad2 size={20} />,
  '咖啡探店': <Coffee size={20} />,
  '咖啡聚会': <Coffee size={20} />,
  '美食打卡': <Utensils size={20} />,
  '运动': <Utensils size={20} />, // Defaulting to generic for now, ideally import Trophy
};

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { activities, addActivity, toggleFavorite, isFavorite } = useActivity();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('全部');

  // 从后端API获取活动列表
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const response = await fetch('/api/activities');
        if (response.ok) {
          const fetchedActivities = await response.json();
          
          // 清空现有活动并添加从API获取的活动
          // 注意：这里应该先清空本地活动，但为了简单起见，我们只添加新活动
          fetchedActivities.forEach((activity: any) => {
            // 检查活动是否已存在
            const exists = activities.some(a => a.id === activity.id);
            if (!exists) {
              const formattedActivity = {
                id: activity.id,
                title: activity.title,
                image: activity.image,
                location: activity.location,
                date: activity.date,
                participants: activity.participants,
                needed: activity.needed,
                tag: activity.tag,
                avatars: [], // 实际应该从参与者表获取
                full: activity.status === 'full',
                description: activity.description,
                isUserCreated: activity.is_user_created
              };
              addActivity(formattedActivity);
            }
          });
        }
      } catch (error) {
        console.error('Error fetching activities:', error);
      }
    };

    fetchActivities();
  }, [activities, addActivity]);

  // Extract unique categories from activities
  const dynamicCategories = useMemo(() => {
      const uniqueTags = Array.from(new Set(activities.map(a => a.tag)));
      return ['全部', ...uniqueTags];
  }, [activities]);

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = activity.title.includes(searchQuery) || 
    activity.location.includes(searchQuery) ||
    activity.tag.includes(searchQuery);
    
    const matchesCategory = activeCategory === '全部' || activity.tag === activeCategory;
    
    return matchesSearch && matchesCategory;
  });

  const showTrending = searchQuery === '' && activeCategory === '全部';

  return (
    <div className="flex-1 overflow-y-auto pb-24 no-scrollbar">
      <header className="sticky top-0 z-20 bg-background-light/95 backdrop-blur-md pt-12 pb-2 px-6 border-b border-primary/10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-extrabold leading-tight tracking-tight">早上好,<br /> <span className="text-primary">{user.name}! 👋</span></h2>
          </div>
          <div className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-full shadow-sm border border-primary/10">
            <MapPin size={16} className="text-primary" />
            <p className="text-sm font-bold text-slate-700">{user.location || '上海'}</p>
            <ChevronDown size={16} className="text-slate-400" />
          </div>
        </div>
        <div className="relative group">
          <div className="flex w-full items-center rounded-full bg-white shadow-sm border border-primary/10 focus-within:border-primary/50 transition-all">
            <div className="pl-4 pr-2 text-primary">
              <Search size={20} />
            </div>
            <input 
              className="w-full bg-transparent border-none focus:ring-0 text-slate-900 placeholder:text-slate-400 text-base font-medium h-12 py-2" 
              placeholder="发现下一个趣玩活动..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="pr-2">
              <button className="w-8 h-8 flex items-center justify-center bg-primary/10 rounded-full text-primary hover:bg-primary hover:text-white transition-colors">
                <SlidersHorizontal size={16} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="py-4">
        {/* Removed no-scrollbar and added custom-scrollbar to show the axis */}
        <div className="flex gap-3 px-6 overflow-x-auto custom-scrollbar pb-3 snap-x w-full">
          {dynamicCategories.map((cat, idx) => (
            <button 
              key={idx}
              onClick={() => setActiveCategory(cat)}
              className={`snap-start shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-full shadow-sm transition-transform active:scale-95 ${activeCategory === cat ? 'bg-primary text-white shadow-primary/30' : 'bg-white border border-slate-100 text-slate-600 hover:bg-primary/5'}`}
            >
              {cat === '全部' ? <Tag size={20} /> : (iconMap[cat] || <Tag size={20} />)}
              <span className="text-sm font-bold whitespace-nowrap">{cat}</span>
            </button>
          ))}
          {/* Spacer for right padding in scroll container */}
          <div className="w-6 shrink-0 h-1"></div>
        </div>
      </div>

      {showTrending && (
        <section className="px-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">热门推荐 <Flame className="text-orange-500 fill-orange-500" size={20} /></h3>
            <button className="text-sm font-semibold text-primary hover:text-primary/80">查看全部</button>
          </div>
          
          <div 
            onClick={() => navigate('/detail')}
            className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden group shadow-xl shadow-primary/10 cursor-pointer"
          >
            <img 
              alt="Trending activity" 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAiFBqZ93Fr_Oe8lEas7oVDvWfXo-vW_cZTEUvOOMH5KjgjRDRbf3XYHGpG_pKuWnPIucXKJdio5wSroJEMdsdueMT61pyzSPimnssh2CAHf7r1Q7OCPlmlDnTIdXc9jv9wDPj9Vyef1bpqK4-9kswBWtpCpy9caUTAm7_E9RSbuoupSCdSPEacgdXEueI1tzKqkZQ_JcEWVKi8cUUcY6Xb9h1Kqbezum6JFAgvoC851gAKw3LVzIIPQP_7J1u4mVRfsbugBgAuULI"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
            <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md border border-white/30 text-white px-3 py-1 rounded-full text-xs font-bold">
              正在流行
            </div>
            <div className="absolute bottom-0 left-0 w-full p-5">
              <div className="flex items-end justify-between">
                <div>
                  <h4 className="text-white text-2xl font-bold mb-2 leading-tight">霓虹夜色摄影漫步</h4>
                  <div className="flex flex-wrap gap-2 text-white/90 text-sm font-medium">
                    <span className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-lg">
                      <Clock size={16} /> 20:00 今天
                    </span>
                    <span className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-lg">
                      <Users size={16} /> 还差 2 人
                    </span>
                  </div>
                </div>
                <button className="bg-primary hover:bg-primary/90 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg shadow-primary/40 transition-transform active:scale-90">
                  <ArrowRight size={24} />
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="px-6 space-y-6">
        <h3 className="text-xl font-bold text-slate-900">{searchQuery ? '搜索结果' : '附近的活动'}</h3>
        {filteredActivities.length > 0 ? (
          filteredActivities.map((activity) => (
            <div key={activity.id} onClick={() => navigate('/detail', { state: { activity } })} className={`bg-white rounded-2xl p-3 shadow-sm border border-slate-100 flex gap-4 cursor-pointer ${activity.full ? 'opacity-75 grayscale hover:grayscale-0 hover:opacity-100 transition-all' : ''}`}>
              <div className="relative w-28 h-28 shrink-0 rounded-xl overflow-hidden">
                <img alt={activity.title} className="w-full h-full object-cover" src={activity.image} />
                <div className={`absolute top-1 left-1 backdrop-blur text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${activity.full ? 'bg-slate-200 text-slate-500' : 'bg-white/90 text-primary'}`}>
                  {activity.tag}
                </div>
              </div>
              <div className="flex flex-col flex-1 justify-between py-1">
                <div>
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-slate-900 text-lg leading-tight mb-1">{activity.title}</h4>
                    <button 
                      className={`text-slate-400 hover:text-primary transition-colors ${isFavorite(activity.id) ? 'text-primary' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(activity.id);
                      }}
                    >
                      <Heart size={20} className={isFavorite(activity.id) ? 'fill-current' : ''} />
                    </button>
                  </div>
                  <p className="text-slate-500 text-xs font-medium flex items-center gap-1">
                    <MapPin size={14} /> {activity.location}
                  </p>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex -space-x-2">
                    {activity.avatars.map((avatar, idx) => (
                      <img key={idx} alt="user" className="w-7 h-7 rounded-full border-2 border-white object-cover" src={avatar} />
                    ))}
                    {activity.participants > activity.avatars.length && (
                      <div className={`w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold ${activity.full ? 'bg-slate-100 text-slate-500' : 'bg-primary/10 text-primary'}`}>
                        +{activity.participants}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <span className={`block text-xs font-bold ${activity.full ? 'text-slate-500' : 'text-primary'}`}>{activity.date}</span>
                    <span className={`text-[10px] font-medium ${activity.full ? 'text-red-400' : 'text-slate-400'}`}>
                      {activity.full ? '候补中' : `还差 ${activity.needed} 人`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400">
            <Search size={48} className="mb-4 opacity-20" />
            <p>没有找到此分类的活动</p>
          </div>
        )}
      </section>
      <div className="h-8"></div>
    </div>
  );
};