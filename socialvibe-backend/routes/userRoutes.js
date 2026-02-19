const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabaseAdmin } = require('../config/supabase');

const router = express.Router();

// 获取所有用户
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 获取单个用户详情
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 创建新用户
router.post('/', 
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, avatar, bio, email, location } = req.body;

      const { data: user, error } = await supabaseAdmin
        .from('users')
        .insert({
          name,
          avatar,
          bio,
          email,
          location
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          return res.status(400).json({ error: 'Email already exists' });
        }
        return res.status(500).json({ error: error.message });
      }

      res.status(201).json(user);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// 更新用户信息
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 删除用户
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 先删除用户相关的所有记录
    await supabaseAdmin
      .from('activity_participants')
      .delete()
      .eq('user_id', id);

    await supabaseAdmin
      .from('favorites')
      .delete()
      .eq('user_id', id);

    await supabaseAdmin
      .from('chat_members')
      .delete()
      .eq('user_id', id);

    await supabaseAdmin
      .from('messages')
      .delete()
      .eq('user_id', id);

    await supabaseAdmin
      .from('user_avatars')
      .delete()
      .eq('user_id', id);

    // 再删除用户
    const { error } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 通过邮箱查找用户
router.get('/email/:email', async (req, res) => {
  try {
    const { email } = req.params;

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 获取用户的活动统计
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;

    // 获取用户创建的活动数量
    const { count: createdCount, error: createdError } = await supabaseAdmin
      .from('activities')
      .select('id', { count: 'exact' })
      .eq('host_id', id)
      .eq('is_user_created', true);

    if (createdError) {
      return res.status(500).json({ error: createdError.message });
    }

    // 获取用户参加的活动数量
    const { count: participatedCount, error: participatedError } = await supabaseAdmin
      .from('activity_participants')
      .select('id', { count: 'exact' })
      .eq('user_id', id);

    if (participatedError) {
      return res.status(500).json({ error: participatedError.message });
    }

    // 获取用户收藏的活动数量
    const { count: favoriteCount, error: favoriteError } = await supabaseAdmin
      .from('favorites')
      .select('id', { count: 'exact' })
      .eq('user_id', id);

    if (favoriteError) {
      return res.status(500).json({ error: favoriteError.message });
    }

    res.json({
      created: createdCount || 0,
      participated: participatedCount || 0,
      favorites: favoriteCount || 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;