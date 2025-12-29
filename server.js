require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Client } = require('@notionhq/client');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const notion = new Client({ auth: process.env.NOTION_TOKEN });

// 실제 노션 데이터베이스 ID (하드코딩)
const DB_IDS = {
  influencers: '94d490dd-8b65-4351-a6eb-eb32a965134f',  // 인플루언서 DB
  brands: '2b708b1c-348f-812b-a282-e385a1b2a5b9',       // 브랜드 목록 DB
  campaigns: '2b708b1c-348f-8141-999f-f77b91095543'     // 캠페인 DB
};

// ===================== 브랜드 API =====================
app.get('/api/brands', async (req, res) => {
  try {
    const response = await notion.databases.query({
      database_id: DB_IDS.brands,
      sorts: [{ timestamp: 'created_time', direction: 'descending' }]
    });

    const data = response.results.map(page => ({
      id: page.id,
      브랜드명: page.properties['브랜드명']?.title?.[0]?.plain_text || '',
      상태: page.properties['상태']?.status?.name || '',
      이메일: page.properties['이메일']?.email || '',
      전화번호: page.properties['전화번호']?.phone_number || '',
      업종: page.properties['업종']?.select?.name || '',
      유입경로: page.properties['유입경로']?.select?.name || '',
      브랜드담당자: page.properties['브랜드 담당자']?.rich_text?.[0]?.plain_text || '',
      계좌정보: page.properties['계좌 정보']?.rich_text?.[0]?.plain_text || '',
      입력완료: page.properties['입력완료√']?.checkbox || false
    }));

    res.json(data);
  } catch (error) {
    console.error('Brands fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/brands', async (req, res) => {
  try {
    const { 브랜드명, 상태, 이메일, 전화번호, 업종, 유입경로, 브랜드담당자, 계좌정보 } = req.body;

    const properties = {
      '브랜드명': { title: [{ text: { content: 브랜드명 || '' } }] }
    };

    if (상태) properties['상태'] = { status: { name: 상태 } };
    if (이메일) properties['이메일'] = { email: 이메일 };
    if (전화번호) properties['전화번호'] = { phone_number: 전화번호 };
    if (업종) properties['업종'] = { select: { name: 업종 } };
    if (유입경로) properties['유입경로'] = { select: { name: 유입경로 } };
    if (브랜드담당자) properties['브랜드 담당자'] = { rich_text: [{ text: { content: 브랜드담당자 } }] };
    if (계좌정보) properties['계좌 정보'] = { rich_text: [{ text: { content: 계좌정보 } }] };

    const response = await notion.pages.create({
      parent: { database_id: DB_IDS.brands },
      properties
    });

    res.json({ success: true, id: response.id });
  } catch (error) {
    console.error('Brand create error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/brands/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 브랜드명, 상태, 이메일, 전화번호, 업종, 유입경로, 브랜드담당자, 계좌정보 } = req.body;

    const properties = {};
    if (브랜드명 !== undefined) properties['브랜드명'] = { title: [{ text: { content: 브랜드명 } }] };
    if (상태) properties['상태'] = { status: { name: 상태 } };
    if (이메일 !== undefined) properties['이메일'] = { email: 이메일 || null };
    if (전화번호 !== undefined) properties['전화번호'] = { phone_number: 전화번호 || null };
    if (업종) properties['업종'] = { select: { name: 업종 } };
    if (유입경로) properties['유입경로'] = { select: { name: 유입경로 } };
    if (브랜드담당자 !== undefined) properties['브랜드 담당자'] = { rich_text: [{ text: { content: 브랜드담당자 } }] };
    if (계좌정보 !== undefined) properties['계좌 정보'] = { rich_text: [{ text: { content: 계좌정보 } }] };

    await notion.pages.update({ page_id: id, properties });
    res.json({ success: true });
  } catch (error) {
    console.error('Brand update error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/brands/:id', async (req, res) => {
  try {
    await notion.pages.update({ page_id: req.params.id, archived: true });
    res.json({ success: true });
  } catch (error) {
    console.error('Brand delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===================== 인플루언서 API =====================
app.get('/api/influencers', async (req, res) => {
  try {
    const response = await notion.databases.query({
      database_id: DB_IDS.influencers,
      sorts: [{ property: '생성 일시', direction: 'descending' }]
    });

    const data = response.results.map(page => ({
      id: page.id,
      이름: page.properties['이름']?.title?.[0]?.plain_text || '',
      연락처: page.properties['연락처']?.phone_number || '',
      이메일: page.properties['이메일']?.email || '',
      팔로워수: page.properties['팔로워 수']?.number || 0,
      인스타그램: page.properties['인스타그램 프로필']?.rich_text?.[0]?.plain_text || '',
      상태: page.properties['상태']?.status?.name || '',
      등급: page.properties['등급']?.formula?.string || '',
      활동분야: page.properties['활동 분야']?.multi_select?.map(s => s.name) || [],
      콘텐츠유형: page.properties['제작 가능한 콘텐츠 유형']?.multi_select?.map(s => s.name) || [],
      크리에이터유형: page.properties['크리에이터 유형']?.select?.name || '',
      희망보상: page.properties['희망 보상']?.multi_select?.map(s => s.name) || [],
      개인정보동의: page.properties['개인정보 수집 및 이용 동의']?.checkbox || false,
      생성일시: page.properties['생성 일시']?.created_time || ''
    }));

    res.json(data);
  } catch (error) {
    console.error('Influencers fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/influencers', async (req, res) => {
  try {
    const { 이름, 연락처, 이메일, 팔로워수, 인스타그램, 상태, 활동분야, 콘텐츠유형, 크리에이터유형, 희망보상 } = req.body;

    const properties = {
      '이름': { title: [{ text: { content: 이름 || '' } }] }
    };

    if (연락처) properties['연락처'] = { phone_number: 연락처 };
    if (이메일) properties['이메일'] = { email: 이메일 };
    if (팔로워수) properties['팔로워 수'] = { number: parseInt(팔로워수) };
    if (인스타그램) properties['인스타그램 프로필'] = { rich_text: [{ text: { content: 인스타그램 } }] };
    if (상태) properties['상태'] = { status: { name: 상태 } };
    if (활동분야 && 활동분야.length > 0) {
      properties['활동 분야'] = { multi_select: 활동분야.map(name => ({ name })) };
    }
    if (콘텐츠유형 && 콘텐츠유형.length > 0) {
      properties['제작 가능한 콘텐츠 유형'] = { multi_select: 콘텐츠유형.map(name => ({ name })) };
    }
    if (크리에이터유형) properties['크리에이터 유형'] = { select: { name: 크리에이터유형 } };
    if (희망보상 && 희망보상.length > 0) {
      properties['희망 보상'] = { multi_select: 희망보상.map(name => ({ name })) };
    }

    const response = await notion.pages.create({
      parent: { database_id: DB_IDS.influencers },
      properties
    });

    res.json({ success: true, id: response.id });
  } catch (error) {
    console.error('Influencer create error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/influencers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 이름, 연락처, 이메일, 팔로워수, 인스타그램, 상태, 활동분야, 콘텐츠유형, 크리에이터유형, 희망보상 } = req.body;

    const properties = {};
    if (이름 !== undefined) properties['이름'] = { title: [{ text: { content: 이름 } }] };
    if (연락처 !== undefined) properties['연락처'] = { phone_number: 연락처 || null };
    if (이메일 !== undefined) properties['이메일'] = { email: 이메일 || null };
    if (팔로워수 !== undefined) properties['팔로워 수'] = { number: parseInt(팔로워수) || null };
    if (인스타그램 !== undefined) properties['인스타그램 프로필'] = { rich_text: [{ text: { content: 인스타그램 } }] };
    if (상태) properties['상태'] = { status: { name: 상태 } };
    if (활동분야 !== undefined) {
      properties['활동 분야'] = { multi_select: 활동분야.map(name => ({ name })) };
    }
    if (콘텐츠유형 !== undefined) {
      properties['제작 가능한 콘텐츠 유형'] = { multi_select: 콘텐츠유형.map(name => ({ name })) };
    }
    if (크리에이터유형) properties['크리에이터 유형'] = { select: { name: 크리에이터유형 } };
    if (희망보상 !== undefined) {
      properties['희망 보상'] = { multi_select: 희망보상.map(name => ({ name })) };
    }

    await notion.pages.update({ page_id: id, properties });
    res.json({ success: true });
  } catch (error) {
    console.error('Influencer update error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/influencers/:id', async (req, res) => {
  try {
    await notion.pages.update({ page_id: req.params.id, archived: true });
    res.json({ success: true });
  } catch (error) {
    console.error('Influencer delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===================== 캠페인 API =====================
app.get('/api/campaigns', async (req, res) => {
  try {
    const response = await notion.databases.query({
      database_id: DB_IDS.campaigns,
      sorts: [{ property: '캠페인 시작일', direction: 'descending' }]
    });

    const data = response.results.map(page => ({
      id: page.id,
      캠페인명: page.properties['캠페인명']?.title?.[0]?.plain_text || '',
      상태: page.properties['상태']?.status?.name || '',
      캠페인유형: page.properties['캠페인 유형']?.select?.name || '',
      카테고리: page.properties['카테고리']?.select?.name || '',
      시작일: page.properties['캠페인 시작일']?.date?.start || '',
      종료일: page.properties['캠페인 종료일']?.date?.start || '',
      예산: page.properties['예산(만원)']?.number || 0,
      목표인원: page.properties['목표 인원']?.number || 0,
      참여인원: page.properties['캠페인 총 참여 인원']?.rollup?.number || 0,
      리밋: page.properties['리밋']?.number || 0,
      맨션ID: page.properties['맨션 ID']?.rich_text?.[0]?.plain_text || '',
      브랜드계정: page.properties['브랜드 계정']?.url || '',
      제휴링크: page.properties['제휴 링크']?.url || '',
      협찬제품: page.properties['협찬 제품']?.multi_select?.map(s => s.name) || [],
      메모: page.properties['메모']?.rich_text?.[0]?.plain_text || '',
      입력완료: page.properties['입력완료√']?.checkbox || false
    }));

    res.json(data);
  } catch (error) {
    console.error('Campaigns fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/campaigns', async (req, res) => {
  try {
    const { 캠페인명, 상태, 캠페인유형, 카테고리, 시작일, 종료일, 예산, 목표인원, 리밋, 맨션ID, 브랜드계정, 제휴링크, 협찬제품, 메모 } = req.body;

    const properties = {
      '캠페인명': { title: [{ text: { content: 캠페인명 || '' } }] }
    };

    if (상태) properties['상태'] = { status: { name: 상태 } };
    if (캠페인유형) properties['캠페인 유형'] = { select: { name: 캠페인유형 } };
    if (카테고리) properties['카테고리'] = { select: { name: 카테고리 } };
    if (시작일) properties['캠페인 시작일'] = { date: { start: 시작일 } };
    if (종료일) properties['캠페인 종료일'] = { date: { start: 종료일 } };
    if (예산) properties['예산(만원)'] = { number: parseInt(예산) };
    if (목표인원) properties['목표 인원'] = { number: parseInt(목표인원) };
    if (리밋) properties['리밋'] = { number: parseInt(리밋) };
    if (맨션ID) properties['맨션 ID'] = { rich_text: [{ text: { content: 맨션ID } }] };
    if (브랜드계정) properties['브랜드 계정'] = { url: 브랜드계정 };
    if (제휴링크) properties['제휴 링크'] = { url: 제휴링크 };
    if (협찬제품 && 협찬제품.length > 0) {
      properties['협찬 제품'] = { multi_select: 협찬제품.map(name => ({ name })) };
    }
    if (메모) properties['메모'] = { rich_text: [{ text: { content: 메모 } }] };

    const response = await notion.pages.create({
      parent: { database_id: DB_IDS.campaigns },
      properties
    });

    res.json({ success: true, id: response.id });
  } catch (error) {
    console.error('Campaign create error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/campaigns/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 캠페인명, 상태, 캠페인유형, 카테고리, 시작일, 종료일, 예산, 목표인원, 리밋, 맨션ID, 브랜드계정, 제휴링크, 협찬제품, 메모 } = req.body;

    const properties = {};
    if (캠페인명 !== undefined) properties['캠페인명'] = { title: [{ text: { content: 캠페인명 } }] };
    if (상태) properties['상태'] = { status: { name: 상태 } };
    if (캠페인유형) properties['캠페인 유형'] = { select: { name: 캠페인유형 } };
    if (카테고리) properties['카테고리'] = { select: { name: 카테고리 } };
    if (시작일 !== undefined) properties['캠페인 시작일'] = { date: 시작일 ? { start: 시작일 } : null };
    if (종료일 !== undefined) properties['캠페인 종료일'] = { date: 종료일 ? { start: 종료일 } : null };
    if (예산 !== undefined) properties['예산(만원)'] = { number: parseInt(예산) || null };
    if (목표인원 !== undefined) properties['목표 인원'] = { number: parseInt(목표인원) || null };
    if (리밋 !== undefined) properties['리밋'] = { number: parseInt(리밋) || null };
    if (맨션ID !== undefined) properties['맨션 ID'] = { rich_text: [{ text: { content: 맨션ID } }] };
    if (브랜드계정 !== undefined) properties['브랜드 계정'] = { url: 브랜드계정 || null };
    if (제휴링크 !== undefined) properties['제휴 링크'] = { url: 제휴링크 || null };
    if (협찬제품 !== undefined) {
      properties['협찬 제품'] = { multi_select: 협찬제품.map(name => ({ name })) };
    }
    if (메모 !== undefined) properties['메모'] = { rich_text: [{ text: { content: 메모 } }] };

    await notion.pages.update({ page_id: id, properties });
    res.json({ success: true });
  } catch (error) {
    console.error('Campaign update error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/campaigns/:id', async (req, res) => {
  try {
    await notion.pages.update({ page_id: req.params.id, archived: true });
    res.json({ success: true });
  } catch (error) {
    console.error('Campaign delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===================== 대시보드 통계 API =====================
app.get('/api/dashboard', async (req, res) => {
  try {
    const [brandsRes, influencersRes, campaignsRes] = await Promise.all([
      notion.databases.query({ database_id: DB_IDS.brands }),
      notion.databases.query({ database_id: DB_IDS.influencers }),
      notion.databases.query({ database_id: DB_IDS.campaigns })
    ]);

    // 브랜드 통계
    const brandStats = {
      total: brandsRes.results.length,
      byStatus: {}
    };
    brandsRes.results.forEach(page => {
      const status = page.properties['상태']?.status?.name || '미정';
      brandStats.byStatus[status] = (brandStats.byStatus[status] || 0) + 1;
    });

    // 인플루언서 통계
    const influencerStats = {
      total: influencersRes.results.length,
      byStatus: {},
      byCategory: {},
      totalFollowers: 0
    };
    influencersRes.results.forEach(page => {
      const status = page.properties['상태']?.status?.name || '미정';
      influencerStats.byStatus[status] = (influencerStats.byStatus[status] || 0) + 1;

      const categories = page.properties['활동 분야']?.multi_select || [];
      categories.forEach(cat => {
        influencerStats.byCategory[cat.name] = (influencerStats.byCategory[cat.name] || 0) + 1;
      });

      influencerStats.totalFollowers += page.properties['팔로워 수']?.number || 0;
    });

    // 캠페인 통계
    const campaignStats = {
      total: campaignsRes.results.length,
      byStatus: {},
      byType: {},
      totalBudget: 0,
      totalParticipants: 0
    };
    campaignsRes.results.forEach(page => {
      const status = page.properties['상태']?.status?.name || '미정';
      campaignStats.byStatus[status] = (campaignStats.byStatus[status] || 0) + 1;

      const type = page.properties['캠페인 유형']?.select?.name || '미정';
      campaignStats.byType[type] = (campaignStats.byType[type] || 0) + 1;

      campaignStats.totalBudget += page.properties['예산(만원)']?.number || 0;
      campaignStats.totalParticipants += page.properties['캠페인 총 참여 인원']?.rollup?.number || 0;
    });

    res.json({
      brands: brandStats,
      influencers: influencerStats,
      campaigns: campaignStats
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===================== 캠페인 상세 API =====================
app.get('/api/campaigns/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const page = await notion.pages.retrieve({ page_id: id });

    const campaign = {
      id: page.id,
      캠페인명: page.properties['캠페인명']?.title?.[0]?.plain_text || '',
      상태: page.properties['상태']?.status?.name || '',
      캠페인유형: page.properties['캠페인 유형']?.select?.name || '',
      카테고리: page.properties['카테고리']?.select?.name || '',
      시작일: page.properties['캠페인 시작일']?.date?.start || '',
      종료일: page.properties['캠페인 종료일']?.date?.start || '',
      예산: page.properties['예산(만원)']?.number || 0,
      목표인원: page.properties['목표 인원']?.number || 0,
      참여인원: page.properties['캠페인 총 참여 인원']?.rollup?.number || 0,
      리밋: page.properties['리밋']?.number || 0,
      맨션ID: page.properties['맨션 ID']?.rich_text?.[0]?.plain_text || '',
      브랜드계정: page.properties['브랜드 계정']?.url || '',
      제휴링크: page.properties['제휴 링크']?.url || '',
      협찬제품: page.properties['협찬 제품']?.multi_select?.map(s => s.name) || [],
      메모: page.properties['메모']?.rich_text?.[0]?.plain_text || '',
      입력완료: page.properties['입력완료√']?.checkbox || false,
      담당자: page.properties['담당자']?.people?.map(p => p.name) || [],
      총좋아요수: page.properties['총 좋아요 수']?.formula?.number || 0,
      총댓글수: page.properties['총 댓글 수']?.formula?.number || 0,
      총공유수: page.properties['총 공유 수']?.formula?.number || 0,
      총맨션피드수: page.properties['총 맨션 피드 수']?.formula?.number || 0,
      비디오총재생수: page.properties['비디오 총 재생수']?.formula?.number || 0,
      총판매수: page.properties['총 판매수']?.number || 0
    };

    // 샘플 일간 데이터 생성 (실제로는 노션 DB에서 가져와야 함)
    const dailyData = generateSampleDailyData(campaign.시작일, campaign.종료일);

    res.json({ campaign, dailyData });
  } catch (error) {
    console.error('Campaign detail error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 샘플 일간 데이터 생성 함수
function generateSampleDailyData(startDate, endDate) {
  const data = [];
  const start = startDate ? new Date(startDate) : new Date();
  const end = endDate ? new Date(endDate) : new Date();
  const today = new Date();

  // 최근 7일 데이터만 생성
  const recentDays = 7;
  for (let i = recentDays - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    if (date >= start && date <= end) {
      data.push({
        date: date.toISOString().split('T')[0],
        followers_count: Math.floor(Math.random() * 500) + 500,
        follows_count: Math.floor(Math.random() * 3000) + 2000,
        media_count: Math.floor(Math.random() * 50) + 50,
        reach: Math.floor(Math.random() * 3000) + 2000,
        total_interactions: Math.floor(Math.random() * 20) + 5,
        accounts_engaged: Math.floor(Math.random() * 5) + 1,
        likes: Math.floor(Math.random() * 5) + 1,
        comments: Math.floor(Math.random() * 3),
        saves: Math.floor(Math.random() * 2),
        shares: Math.floor(Math.random() * 5),
        profile_views: Math.floor(Math.random() * 30) + 10,
        website_clicks: Math.floor(Math.random() * 3)
      });
    }
  }

  return data;
}

// ===================== 데이터베이스 옵션 조회 API =====================
app.get('/api/options', async (req, res) => {
  try {
    const [brandsDb, influencersDb, campaignsDb] = await Promise.all([
      notion.databases.retrieve({ database_id: DB_IDS.brands }),
      notion.databases.retrieve({ database_id: DB_IDS.influencers }),
      notion.databases.retrieve({ database_id: DB_IDS.campaigns })
    ]);

    res.json({
      brands: {
        상태: brandsDb.properties['상태']?.status?.options || [],
        업종: brandsDb.properties['업종']?.select?.options || [],
        유입경로: brandsDb.properties['유입경로']?.select?.options || []
      },
      influencers: {
        상태: influencersDb.properties['상태']?.status?.options || [],
        활동분야: influencersDb.properties['활동 분야']?.multi_select?.options || [],
        콘텐츠유형: influencersDb.properties['제작 가능한 콘텐츠 유형']?.multi_select?.options || [],
        크리에이터유형: influencersDb.properties['크리에이터 유형']?.select?.options || [],
        희망보상: influencersDb.properties['희망 보상']?.multi_select?.options || []
      },
      campaigns: {
        상태: campaignsDb.properties['상태']?.status?.options || [],
        캠페인유형: campaignsDb.properties['캠페인 유형']?.select?.options || [],
        카테고리: campaignsDb.properties['카테고리']?.select?.options || [],
        협찬제품: campaignsDb.properties['협찬 제품']?.multi_select?.options || []
      }
    });
  } catch (error) {
    console.error('Options fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`웰웨이브 서버 실행중: http://localhost:${PORT}`);
});
