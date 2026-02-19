const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabaseAdmin } = require('../config/supabase');

const router = express.Router();

// 获取用户的所有聊天
router.get('/user/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;

    const { data: chatMemberships, error } = await supabaseAdmin
      .from('chat_members')
      .select(`
        chat_id,
        chat:chat_id(
          *,
          messages(
            *,
            user:user_id(
              id,
              name,
              avatar
            )
          ),
          members:chat_members(
            *,
            user:user_id(
              id,
              name,
              avatar
            )
          )
        )
      `)
      .eq('user_id', user_id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // 处理聊天数据，添加最后一条消息和未读消息数
    const chats = chatMemberships.map(membership => {
      const chat = membership.chat;
      
      // 按时间排序消息
      const sortedMessages = chat.messages.sort((a, b) => 
        new Date(b.sent_at) - new Date(a.sent_at)
      );
      
      // 获取最后一条消息
      const lastMessage = sortedMessages[0];
      
      // 计算未读消息数
      const unreadCount = chat.messages.filter(msg => 
        msg.user_id !== user_id && !msg.read_at
      ).length;

      return {
        ...chat,
        last_message: lastMessage,
        unread_count: unreadCount,
        members: chat.members.map(m => m.user)
      };
    });

    res.json(chats);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 获取单个聊天详情
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: chat, error } = await supabaseAdmin
      .from('chats')
      .select(`
        *,
        members:chat_members(
          *,
          user:user_id(
            id,
            name,
            avatar
          )
        ),
        messages(
          *,
          user:user_id(
            id,
            name,
            avatar
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // 按时间排序消息
    const sortedMessages = chat.messages.sort((a, b) => 
      new Date(a.sent_at) - new Date(b.sent_at)
    );

    res.json({
      ...chat,
      messages: sortedMessages,
      members: chat.members.map(m => m.user)
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 创建新聊天
router.post('/', 
  body('name').notEmpty().withMessage('Chat name is required'),
  body('member_ids').isArray().withMessage('Member IDs must be an array'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, member_ids, is_group = false } = req.body;

      // 创建聊天
      const { data: chat, error: chatError } = await supabaseAdmin
        .from('chats')
        .insert({
          name,
          is_group
        })
        .select()
        .single();

      if (chatError) {
        return res.status(500).json({ error: chatError.message });
      }

      // 添加成员
      const memberInserts = member_ids.map(user_id => ({
        chat_id: chat.id,
        user_id
      }));

      const { error: memberError } = await supabaseAdmin
        .from('chat_members')
        .insert(memberInserts);

      if (memberError) {
        // 回滚聊天创建
        await supabaseAdmin
          .from('chats')
          .delete()
          .eq('id', chat.id);

        return res.status(500).json({ error: memberError.message });
      }

      res.status(201).json(chat);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// 发送消息
router.post('/:id/messages', 
  body('content').notEmpty().withMessage('Message content is required'),
  body('user_id').notEmpty().withMessage('User ID is required'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const { content, user_id } = req.body;

      // 检查用户是否是聊天成员
      const { data: member, error: memberError } = await supabaseAdmin
        .from('chat_members')
        .select('*')
        .eq('chat_id', id)
        .eq('user_id', user_id)
        .single();

      if (memberError) {
        return res.status(403).json({ error: 'User is not a member of this chat' });
      }

      // 发送消息
      const { data: message, error } = await supabaseAdmin
        .from('messages')
        .insert({
          chat_id: id,
          user_id,
          content
        })
        .select(`
          *,
          user:user_id(
            id,
            name,
            avatar
          )
        `)
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      res.status(201).json(message);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// 标记消息为已读
router.put('/:id/messages/read', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, message_ids } = req.body;

    // 检查用户是否是聊天成员
    const { data: member, error: memberError } = await supabaseAdmin
      .from('chat_members')
      .select('*')
      .eq('chat_id', id)
      .eq('user_id', user_id)
      .single();

    if (memberError) {
      return res.status(403).json({ error: 'User is not a member of this chat' });
    }

    // 标记消息为已读
    const { error } = await supabaseAdmin
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('chat_id', id)
      .in('id', message_ids)
      .neq('user_id', user_id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 添加聊天成员
router.post('/:id/members', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    // 检查聊天是否存在
    const { data: chat, error: chatError } = await supabaseAdmin
      .from('chats')
      .select('*')
      .eq('id', id)
      .single();

    if (chatError) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // 检查用户是否已经是成员
    const { data: existingMember, error: memberError } = await supabaseAdmin
      .from('chat_members')
      .select('*')
      .eq('chat_id', id)
      .eq('user_id', user_id)
      .single();

    if (!memberError) {
      return res.status(400).json({ error: 'User is already a member of this chat' });
    }

    // 添加成员
    const { data: newMember, error } = await supabaseAdmin
      .from('chat_members')
      .insert({
        chat_id: id,
        user_id
      })
      .select(`
        *,
        user:user_id(
          id,
          name,
          avatar
        )
      `)
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json(newMember);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 移除聊天成员
router.delete('/:id/members/:user_id', async (req, res) => {
  try {
    const { id, user_id } = req.params;

    // 检查聊天是否存在
    const { data: chat, error: chatError } = await supabaseAdmin
      .from('chats')
      .select('*')
      .eq('id', id)
      .single();

    if (chatError) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // 移除成员
    const { error } = await supabaseAdmin
      .from('chat_members')
      .delete()
      .eq('chat_id', id)
      .eq('user_id', user_id);

    if (error) {
      return res.status(404).json({ error: 'User is not a member of this chat' });
    }

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 删除聊天
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 先删除聊天消息
    await supabaseAdmin
      .from('messages')
      .delete()
      .eq('chat_id', id);

    // 再删除聊天成员
    await supabaseAdmin
      .from('chat_members')
      .delete()
      .eq('chat_id', id);

    // 最后删除聊天
    const { error } = await supabaseAdmin
      .from('chats')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    res.json({ message: 'Chat deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;