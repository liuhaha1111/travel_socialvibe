const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabaseAdmin } = require('../config/supabase');

const router = express.Router();

// 获取所有活动
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('activities')
      .select(`
        *,
        host:host_id(
          id,
          name,
          avatar
        )
      `);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 获取单个活动详情
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: activity, error } = await supabaseAdmin
      .from('activities')
      .select(`
        *,
        host:host_id(
          id,
          name,
          avatar
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    // 获取活动参与者
    const { data: participants, error: participantsError } = await supabaseAdmin
      .from('activity_participants')
      .select(`
        *,
        user:user_id(
          id,
          name,
          avatar
        )
      `)
      .eq('activity_id', id);

    if (participantsError) {
      return res.status(500).json({ error: participantsError.message });
    }

    res.json({ ...activity, participants });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 创建新活动
router.post('/', 
  body('title').notEmpty().withMessage('Title is required'),
  body('location').notEmpty().withMessage('Location is required'),
  body('date').notEmpty().withMessage('Date is required'),
  body('tag').notEmpty().withMessage('Tag is required'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { title, image, location, date, full_date, time, max_participants, tag, description, host_id } = req.body;

      // 检查并处理host_id
      let validHostId = host_id;
      
      // 验证UUID格式
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const is_valid_uuid = host_id && uuidRegex.test(host_id);
      
      if (!is_valid_uuid) {
        // 如果host_id无效，创建或使用默认用户
        const { data: defaultUser, error: userError } = await supabaseAdmin
          .from('users')
          .select('id')
          .limit(1)
          .single();
        
        if (userError || !defaultUser) {
          // 创建默认用户
          const { data: newUser } = await supabaseAdmin
            .from('users')
            .insert({
              name: '默认用户',
              avatar: 'https://example.com/avatar.jpg',
              bio: '默认用户',
              email: 'default@example.com',
              location: '默认地点'
            })
            .select('id')
            .single();
          
          validHostId = newUser.id;
        } else {
          validHostId = defaultUser.id;
        }
      }

      const newActivity = {
        title,
        image,
        location,
        date,
        full_date,
        time,
        participants: 1, // 发起人自动参加
        needed: max_participants - 1,
        max_participants,
        tag,
        description,
        is_user_created: true,
        host_id: validHostId,
        status: 'active'
      };

      const { data: activity, error } = await supabaseAdmin
        .from('activities')
        .insert(newActivity)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      // 添加发起人作为参与者
      await supabaseAdmin
        .from('activity_participants')
        .insert({
          activity_id: activity.id,
          user_id: validHostId,
          status: 'confirmed'
        });

      res.status(201).json(activity);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// 更新活动
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data: activity, error } = await supabaseAdmin
      .from('activities')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    res.json(activity);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 删除活动
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 先删除相关的参与者记录
    await supabaseAdmin
      .from('activity_participants')
      .delete()
      .eq('activity_id', id);

    // 再删除活动
    const { error } = await supabaseAdmin
      .from('activities')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    res.json({ message: 'Activity deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 加入活动
router.post('/:id/join', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    // 检查活动是否存在
    const { data: activity, error: activityError } = await supabaseAdmin
      .from('activities')
      .select('*')
      .eq('id', id)
      .single();

    if (activityError) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    // 检查是否已经加入
    const { data: existingParticipant, error: participantError } = await supabaseAdmin
      .from('activity_participants')
      .select('*')
      .eq('activity_id', id)
      .eq('user_id', user_id)
      .single();

    if (!participantError) {
      return res.status(400).json({ error: 'Already joined this activity' });
    }

    // 检查活动是否已满
    if (activity.participants >= activity.max_participants) {
      // 添加到候补名单
      const { data: participant, error } = await supabaseAdmin
        .from('activity_participants')
        .insert({
          activity_id: id,
          user_id,
          status: 'waitlist'
        })
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.json({ ...participant, message: 'Added to waitlist' });
    }

    // 加入活动
    const { data: participant, error } = await supabaseAdmin
      .from('activity_participants')
      .insert({
        activity_id: id,
        user_id,
        status: 'confirmed'
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // 更新活动参与者数量
    await supabaseAdmin
      .from('activities')
      .update({
        participants: activity.participants + 1,
        needed: Math.max(0, activity.needed - 1),
        status: activity.participants + 1 >= activity.max_participants ? 'full' : 'active'
      })
      .eq('id', id);

    res.json(participant);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 退出活动
router.post('/:id/leave', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    // 检查活动是否存在
    const { data: activity, error: activityError } = await supabaseAdmin
      .from('activities')
      .select('*')
      .eq('id', id)
      .single();

    if (activityError) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    // 检查是否是参与者
    const { data: participant, error: participantError } = await supabaseAdmin
      .from('activity_participants')
      .select('*')
      .eq('activity_id', id)
      .eq('user_id', user_id)
      .single();

    if (participantError) {
      return res.status(400).json({ error: 'Not a participant of this activity' });
    }

    // 删除参与者记录
    await supabaseAdmin
      .from('activity_participants')
      .delete()
      .eq('id', participant.id);

    // 更新活动参与者数量
    await supabaseAdmin
      .from('activities')
      .update({
        participants: Math.max(0, activity.participants - 1),
        needed: activity.needed + 1,
        status: 'active' // 恢复为活跃状态
      })
      .eq('id', id);

    // 检查是否有候补人员
    const { data: waitlistParticipants, error: waitlistError } = await supabaseAdmin
      .from('activity_participants')
      .select('*')
      .eq('activity_id', id)
      .eq('status', 'waitlist')
      .order('created_at', { ascending: true })
      .limit(1);

    if (!waitlistError && waitlistParticipants.length > 0) {
      // 把第一个候补人员转为确认状态
      await supabaseAdmin
        .from('activity_participants')
        .update({ status: 'confirmed' })
        .eq('id', waitlistParticipants[0].id);

      // 更新活动参与者数量
      await supabaseAdmin
        .from('activities')
        .update({
          participants: activity.participants,
          needed: Math.max(0, activity.needed),
          status: activity.participants >= activity.max_participants ? 'full' : 'active'
        })
        .eq('id', id);
    }

    res.json({ message: 'Left activity successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 切换收藏状态
router.post('/:id/favorite', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    // 检查是否已经收藏
    const { data: existingFavorite, error: favoriteError } = await supabaseAdmin
      .from('favorites')
      .select('*')
      .eq('activity_id', id)
      .eq('user_id', user_id)
      .single();

    if (!favoriteError) {
      // 取消收藏
      await supabaseAdmin
        .from('favorites')
        .delete()
        .eq('id', existingFavorite.id);

      return res.json({ favorited: false, message: 'Removed from favorites' });
    }

    // 添加收藏
    const { data: favorite, error } = await supabaseAdmin
      .from('favorites')
      .insert({
        activity_id: id,
        user_id
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ favorited: true, message: 'Added to favorites' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 获取用户收藏的活动
router.get('/user/favorites/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;

    const { data: favorites, error } = await supabaseAdmin
      .from('favorites')
      .select(`
        activity_id,
        activity:activity_id(
          *,
          host:host_id(
            id,
            name,
            avatar
          )
        )
      `)
      .eq('user_id', user_id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const favoriteActivities = favorites.map(fav => fav.activity);
    res.json(favoriteActivities);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 获取用户创建的活动
router.get('/user/created/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;

    const { data: activities, error } = await supabaseAdmin
      .from('activities')
      .select(`
        *,
        host:host_id(
          id,
          name,
          avatar
        )
      `)
      .eq('host_id', user_id)
      .eq('is_user_created', true);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(activities);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 获取用户参加的活动
router.get('/user/participated/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;

    const { data: participations, error } = await supabaseAdmin
      .from('activity_participants')
      .select(`
        activity_id,
        status,
        activity:activity_id(
          *,
          host:host_id(
            id,
            name,
            avatar
          )
        )
      `)
      .eq('user_id', user_id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(participations);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;