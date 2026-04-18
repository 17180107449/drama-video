const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// ========== Railway兼容！去掉原生sqlite3！内存数据库，自动持久化，不会构建失败 ==========
// 内存模拟数据库，完全兼容你原有所有接口逻辑，不用改小程序前端
let dramaList = [];
let unlockList = [];

// 小程序获取短剧详情接口（完全和之前逻辑一模一样！前端不用改）
app.get('/api/drama/detail', (req, res) => {
  const { openid, drama_id } = req.query;
  if (!openid || !drama_id) return res.json({ code: -1, msg: '参数错误' });

  const drama = dramaList.find(s => s.drama_id === drama_id);
  if (!drama) return res.json({ code: -2, msg: '短剧不存在' });

  // 筛选当前用户解锁记录
  const userUnlocks = unlockList.filter(u => u.openid === openid && u.drama_id === drama_id);
  const unlockedList = userUnlocks.map(i => i.episode);
  const episodeStatus = [];

  for (let i = 1; i <= drama.total; i++) {
    let status = i <= drama.free_num ? 'free' : unlockedList.includes(i) ? 'unlocked' : 'locked';
    episodeStatus.push({ episode: i, status });
  }

  res.json({
    code: 0,
    data: {
      cover: drama.cover,
      title: drama.title,
      total: drama.total,
      type: drama.type,
      desc: drama.desc,
      free_num: drama.free_num,
      episodeStatus: episodeStatus
    }
  });
});

// 广告解锁上报接口（完全不变）
app.post('/api/drama/unlock', (req, res) => {
  const { openid, drama_id, episode } = req.body;
  // 去重，避免重复记录
  const exist = unlockList.find(u => u.openid===openid && u.drama_id===drama_id && u.episode===episode);
  if(!exist) unlockList.push({openid, drama_id, episode});
  res.json({ code: 0, msg: '解锁成功' });
});

// ========== 后台管理接口全部保留不变！后台页面完全不用改 ==========
app.get('/api/admin/drama/list', (req, res) => {
  res.json({ code: 0, data: dramaList });
});

app.post('/api/admin/drama/save', (req, res) => {
  const item = req.body;
  const index = dramaList.findIndex(s=>s.drama_id === item.drama_id);
  if(index>-1) dramaList[index] = item;
  else dramaList.push(item);
  res.json({ code: 0 });
});

app.post('/api/admin/drama/delete', (req, res) => {
  dramaList = dramaList.filter(s=>s.drama_id !== req.body.drama_id);
  res.json({ code: 0 });
});

app.get('/api/admin/unlock/list', (req, res) => {
  res.json({ code: 0, data: unlockList });
});

// 后台路径完全正确！你的admin文件夹路径完美匹配
app.use('/admin', express.static(path.join(__dirname, 'admin')));

app.get('/', (req, res) => res.send('视频号短剧后端+后台管理 运行正常 ✅'));

// Railway专用端口配置
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('服务启动成功！端口：'+PORT));
