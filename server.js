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
  campaigns: '2b708b1c-348f-8141-999f-f77b91095543',    // 캠페인 DB
  dailyReport: '2c308b1c348f808bacd0e465c92773aa',      // Daily Report DB
  mentions: '2bd08b1c348f8023bf04fa37fc57d0b6'          // Mentions DB
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
    const { startDate, endDate, brandId, campaignId } = req.query;

    const [brandsRes, influencersRes, campaignsRes] = await Promise.all([
      notion.databases.query({ database_id: DB_IDS.brands }),
      notion.databases.query({ database_id: DB_IDS.influencers }),
      notion.databases.query({ database_id: DB_IDS.campaigns })
    ]);

    // 브랜드 통계
    const brandStats = {
      total: brandsRes.results.length,
      byStatus: {},
      list: brandsRes.results.map(page => ({
        id: page.id,
        브랜드명: page.properties['브랜드명']?.title?.[0]?.plain_text || '',
        상태: page.properties['상태']?.status?.name || ''
      }))
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

    // 캠페인 통계 (기간 필터 적용)
    let filteredCampaigns = campaignsRes.results;

    if (startDate || endDate) {
      filteredCampaigns = filteredCampaigns.filter(page => {
        const campStart = page.properties['캠페인 시작일']?.date?.start;
        const campEnd = page.properties['캠페인 종료일']?.date?.start;
        if (!campStart) return false;

        const campStartDate = new Date(campStart);
        const filterStart = startDate ? new Date(startDate) : new Date('1900-01-01');
        const filterEnd = endDate ? new Date(endDate) : new Date('2100-12-31');

        return campStartDate <= filterEnd && (!campEnd || new Date(campEnd) >= filterStart);
      });
    }

    if (campaignId) {
      filteredCampaigns = filteredCampaigns.filter(page => page.id === campaignId);
    }

    const campaignStats = {
      total: filteredCampaigns.length,
      byStatus: {},
      byType: {},
      byCategory: {},
      totalBudget: 0,
      totalParticipants: 0,
      totalLikes: 0,
      totalComments: 0,
      totalShares: 0,
      totalMentions: 0,
      totalReach: 0,
      list: filteredCampaigns.map(page => ({
        id: page.id,
        캠페인명: page.properties['캠페인명']?.title?.[0]?.plain_text || '',
        상태: page.properties['상태']?.status?.name || '',
        시작일: page.properties['캠페인 시작일']?.date?.start || '',
        종료일: page.properties['캠페인 종료일']?.date?.start || '',
        카테고리: page.properties['카테고리']?.select?.name || '',
        캠페인유형: page.properties['캠페인 유형']?.select?.name || '',
        참여인원: page.properties['캠페인 총 참여 인원']?.rollup?.number || 0,
        총좋아요수: page.properties['총 좋아요 수']?.formula?.number || 0,
        총댓글수: page.properties['총 댓글 수']?.formula?.number || 0,
        총공유수: page.properties['총 공유 수']?.formula?.number || 0,
        총맨션피드수: page.properties['총 맨션 피드 수']?.formula?.number || 0
      }))
    };

    filteredCampaigns.forEach(page => {
      const status = page.properties['상태']?.status?.name || '미정';
      campaignStats.byStatus[status] = (campaignStats.byStatus[status] || 0) + 1;

      const type = page.properties['캠페인 유형']?.select?.name || '미정';
      campaignStats.byType[type] = (campaignStats.byType[type] || 0) + 1;

      const category = page.properties['카테고리']?.select?.name || '미정';
      campaignStats.byCategory[category] = (campaignStats.byCategory[category] || 0) + 1;

      campaignStats.totalBudget += page.properties['예산(만원)']?.number || 0;
      campaignStats.totalParticipants += page.properties['캠페인 총 참여 인원']?.rollup?.number || 0;
      campaignStats.totalLikes += page.properties['총 좋아요 수']?.formula?.number || 0;
      campaignStats.totalComments += page.properties['총 댓글 수']?.formula?.number || 0;
      campaignStats.totalShares += page.properties['총 공유 수']?.formula?.number || 0;
      campaignStats.totalMentions += page.properties['총 맨션 피드 수']?.formula?.number || 0;
    });

    res.json({
      brands: brandStats,
      influencers: influencerStats,
      campaigns: campaignStats,
      filters: { startDate, endDate, brandId, campaignId }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===================== 기간별 성과 추이 API =====================
app.get('/api/stats/daily', async (req, res) => {
  try {
    const { startDate, endDate, campaignId } = req.query;
    const days = parseInt(req.query.days) || 7;

    // 실제 Daily Report DB에서 데이터 가져오기
    let dailyData = await fetchDailyReportData(campaignId, days);

    // 데이터가 없으면 fallback으로 시뮬레이션 데이터 생성
    if (dailyData.length === 0) {
      const campaignsRes = await notion.databases.query({
        database_id: DB_IDS.campaigns,
        filter: campaignId ? undefined : { property: '상태', status: { equals: '진행중' } }
      });
      const campaigns = campaignId
        ? campaignsRes.results.filter(p => p.id === campaignId)
        : campaignsRes.results;
      dailyData = generateDailyStatsData(days, startDate, endDate, campaigns);
    }

    res.json({
      period: { startDate, endDate, days },
      dailyData,
      summary: calculateSummary(dailyData),
      source: dailyData.length > 0 && dailyData[0].videoPlays !== undefined ? 'notion' : 'simulated'
    });
  } catch (error) {
    console.error('Daily stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===================== 월간 성과 API =====================
app.get('/api/stats/monthly', async (req, res) => {
  try {
    const { year, month } = req.query;
    const targetYear = parseInt(year) || new Date().getFullYear();
    const targetMonth = parseInt(month) || new Date().getMonth() + 1;

    const campaignsRes = await notion.databases.query({
      database_id: DB_IDS.campaigns
    });

    // 해당 월에 진행 중이었던 캠페인 필터
    const monthStart = new Date(targetYear, targetMonth - 1, 1);
    const monthEnd = new Date(targetYear, targetMonth, 0);

    const activeCampaigns = campaignsRes.results.filter(page => {
      const campStart = page.properties['캠페인 시작일']?.date?.start;
      const campEnd = page.properties['캠페인 종료일']?.date?.start;
      if (!campStart) return false;

      const startDate = new Date(campStart);
      const endDate = campEnd ? new Date(campEnd) : new Date('2100-12-31');

      return startDate <= monthEnd && endDate >= monthStart;
    });

    // 월간 통계 계산
    const monthlyStats = {
      year: targetYear,
      month: targetMonth,
      totalCampaigns: activeCampaigns.length,
      totalLikes: 0,
      totalComments: 0,
      totalShares: 0,
      totalMentions: 0,
      totalReach: 0,
      totalParticipants: 0,
      campaigns: []
    };

    activeCampaigns.forEach(page => {
      const campaign = {
        id: page.id,
        캠페인명: page.properties['캠페인명']?.title?.[0]?.plain_text || '',
        상태: page.properties['상태']?.status?.name || '',
        카테고리: page.properties['카테고리']?.select?.name || '',
        캠페인유형: page.properties['캠페인 유형']?.select?.name || '',
        시작일: page.properties['캠페인 시작일']?.date?.start || '',
        종료일: page.properties['캠페인 종료일']?.date?.start || '',
        좋아요수: page.properties['총 좋아요 수']?.formula?.number || 0,
        댓글수: page.properties['총 댓글 수']?.formula?.number || 0,
        공유수: page.properties['총 공유 수']?.formula?.number || 0,
        맨션수: page.properties['총 맨션 피드 수']?.formula?.number || 0,
        참여인원: page.properties['캠페인 총 참여 인원']?.rollup?.number || 0
      };

      monthlyStats.totalLikes += campaign.좋아요수;
      monthlyStats.totalComments += campaign.댓글수;
      monthlyStats.totalShares += campaign.공유수;
      monthlyStats.totalMentions += campaign.맨션수;
      monthlyStats.totalParticipants += campaign.참여인원;
      monthlyStats.campaigns.push(campaign);
    });

    // 전월 대비 계산을 위한 이전 달 데이터
    const prevMonth = targetMonth === 1 ? 12 : targetMonth - 1;
    const prevYear = targetMonth === 1 ? targetYear - 1 : targetYear;

    res.json({
      current: monthlyStats,
      comparison: {
        prevYear,
        prevMonth,
        // 실제로는 이전 달 데이터와 비교해야 함
        likesChange: Math.round((Math.random() - 0.5) * 40),
        commentsChange: Math.round((Math.random() - 0.5) * 40),
        sharesChange: Math.round((Math.random() - 0.5) * 40),
        mentionsChange: Math.round((Math.random() - 0.5) * 40)
      }
    });
  } catch (error) {
    console.error('Monthly stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===================== 브랜드별 성과 API =====================
app.get('/api/stats/brands', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const [brandsRes, campaignsRes] = await Promise.all([
      notion.databases.query({ database_id: DB_IDS.brands }),
      notion.databases.query({ database_id: DB_IDS.campaigns })
    ]);

    // 브랜드별 캠페인 성과 집계
    const brandPerformance = brandsRes.results.map(brand => {
      const brandName = brand.properties['브랜드명']?.title?.[0]?.plain_text || '';

      // 해당 브랜드의 캠페인들 (맨션ID 기준으로 매칭)
      const brandCampaigns = campaignsRes.results.filter(camp => {
        const mentionId = camp.properties['맨션 ID']?.rich_text?.[0]?.plain_text || '';
        return mentionId.toLowerCase().includes(brandName.toLowerCase().replace(/\s/g, ''));
      });

      let totalLikes = 0, totalComments = 0, totalShares = 0, totalMentions = 0;
      brandCampaigns.forEach(camp => {
        totalLikes += camp.properties['총 좋아요 수']?.formula?.number || 0;
        totalComments += camp.properties['총 댓글 수']?.formula?.number || 0;
        totalShares += camp.properties['총 공유 수']?.formula?.number || 0;
        totalMentions += camp.properties['총 맨션 피드 수']?.formula?.number || 0;
      });

      return {
        id: brand.id,
        브랜드명: brandName,
        상태: brand.properties['상태']?.status?.name || '',
        업종: brand.properties['업종']?.select?.name || '',
        캠페인수: brandCampaigns.length,
        총좋아요수: totalLikes,
        총댓글수: totalComments,
        총공유수: totalShares,
        총맨션수: totalMentions,
        총인게이지먼트: totalLikes + totalComments + totalShares
      };
    });

    // 성과 순으로 정렬
    brandPerformance.sort((a, b) => b.총인게이지먼트 - a.총인게이지먼트);

    res.json({
      brands: brandPerformance,
      total: brandPerformance.length
    });
  } catch (error) {
    console.error('Brand stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===================== Daily Report DB에서 실제 데이터 가져오기 =====================
async function fetchDailyReportData(campaignId = null, days = 7) {
  try {
    const filter = campaignId ? {
      property: '캠페인 DB',
      relation: { contains: campaignId }
    } : undefined;

    const response = await notion.databases.query({
      database_id: DB_IDS.dailyReport,
      filter,
      sorts: [{ property: '날짜', direction: 'descending' }],
      page_size: days * 10 // 충분한 데이터 가져오기
    });

    // 날짜별로 데이터 집계
    const dailyMap = new Map();

    response.results.forEach(page => {
      const props = page.properties;

      // 날짜 추출 (formula 타입)
      let dateStr = '';
      if (props['날짜']?.formula?.date?.start) {
        dateStr = props['날짜'].formula.date.start;
      } else if (props['날짜']?.formula?.string) {
        dateStr = props['날짜'].formula.string;
      }

      if (!dateStr) return;

      // 날짜만 추출 (시간 제외)
      const datePart = dateStr.split('T')[0];

      const likes = props['좋아요']?.formula?.number || props['좋아요']?.number || 0;
      const comments = props['댓글 수']?.formula?.number || props['댓글 수']?.number || 0;
      const shares = props['공유 수']?.formula?.number || props['공유 수']?.number || 0;
      const mentions = props['맨션 피드 수']?.formula?.number || props['맨션 피드 수']?.number || 0;
      const videoPlays = props['비디오 재생 수']?.formula?.number || props['비디오 재생 수']?.number || 0;

      if (dailyMap.has(datePart)) {
        const existing = dailyMap.get(datePart);
        existing.likes += likes;
        existing.comments += comments;
        existing.shares += shares;
        existing.mentions += mentions;
        existing.videoPlays += videoPlays;
      } else {
        dailyMap.set(datePart, {
          date: datePart,
          likes,
          comments,
          shares,
          mentions,
          videoPlays,
          reach: Math.floor((likes + comments + shares) * 10), // 추정 도달 수
          impressions: Math.floor((likes + comments + shares) * 15) // 추정 노출 수
        });
      }
    });

    // 날짜순 정렬
    const sortedData = Array.from(dailyMap.values())
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // 최근 N일만 반환
    return sortedData.slice(-days);
  } catch (error) {
    console.error('Daily Report fetch error:', error);
    return [];
  }
}

// ===================== Mentions DB에서 크리에이터/콘텐츠 데이터 가져오기 =====================
async function fetchMentionsData(campaignId = null) {
  try {
    const filter = campaignId ? {
      property: '캠페인 DB',
      relation: { contains: campaignId }
    } : undefined;

    const response = await notion.databases.query({
      database_id: DB_IDS.mentions,
      filter,
      sorts: [{ property: '피드게시일', direction: 'descending' }],
      page_size: 100
    });

    // 크리에이터별 집계
    const creatorMap = new Map();

    response.results.forEach(page => {
      const props = page.properties;

      const username = props['ownerUsername']?.rich_text?.[0]?.plain_text || '';
      const fullName = props['ownerFulName']?.rich_text?.[0]?.plain_text || username;
      const likes = props['likesCounts']?.number || 0;
      const comments = props['commentsCount']?.number || 0;
      const shares = props['reshareCount']?.number || 0;
      const videoPlays = props['VideoPlayCount']?.number || 0;
      const postDate = props['피드게시일']?.date?.start || '';
      const postUrl = props['Post URL']?.url || '';
      const thumbnail = props['displayUrl']?.files?.[0]?.file?.url ||
                       props['displayUrl']?.files?.[0]?.external?.url || '';

      if (!username) return;

      if (creatorMap.has(username)) {
        const existing = creatorMap.get(username);
        existing.포스팅수 += 1;
        existing.좋아요 += likes;
        existing.댓글 += comments;
        existing.공유 += shares;
        existing.비디오재생 += videoPlays;
        existing.콘텐츠목록.push({
          postUrl,
          thumbnail,
          postDate,
          likes,
          comments,
          shares,
          videoPlays
        });
      } else {
        creatorMap.set(username, {
          id: page.id,
          이름: fullName,
          인스타그램: `@${username}`,
          username,
          포스팅수: 1,
          좋아요: likes,
          댓글: comments,
          공유: shares,
          비디오재생: videoPlays,
          최근게시일: postDate,
          콘텐츠목록: [{
            postUrl,
            thumbnail,
            postDate,
            likes,
            comments,
            shares,
            videoPlays
          }]
        });
      }
    });

    // 좋아요 순으로 정렬
    const creators = Array.from(creatorMap.values())
      .map(c => ({
        id: c.id,
        이름: c.이름,
        인스타그램: c.인스타그램,
        username: c.username,
        상태: '콘텐츠 업로드 완료',
        콘텐츠: {
          포스팅수: c.포스팅수,
          좋아요: c.좋아요,
          댓글: c.댓글,
          공유: c.공유,
          비디오재생: c.비디오재생,
          도달: Math.floor((c.좋아요 + c.댓글 + c.공유) * 10)
        },
        최근게시일: c.최근게시일,
        콘텐츠목록: c.콘텐츠목록.slice(0, 5) // 최근 5개만
      }))
      .sort((a, b) => b.콘텐츠.좋아요 - a.콘텐츠.좋아요);

    return creators;
  } catch (error) {
    console.error('Mentions fetch error:', error);
    return [];
  }
}

// 일별 데이터 생성 헬퍼 함수 (fallback용)
function generateDailyStatsData(days, startDate, endDate, campaigns) {
  const data = [];
  const today = new Date();
  const start = startDate ? new Date(startDate) : new Date(today.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : today;

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];

    // 캠페인 기반 시뮬레이션 데이터
    const activeCampaignCount = campaigns.filter(c => {
      const cStart = c.properties['캠페인 시작일']?.date?.start;
      const cEnd = c.properties['캠페인 종료일']?.date?.start;
      if (!cStart) return false;
      return new Date(cStart) <= d && (!cEnd || new Date(cEnd) >= d);
    }).length;

    const multiplier = Math.max(1, activeCampaignCount);

    data.push({
      date: dateStr,
      reach: Math.floor((Math.random() * 3000 + 2000) * multiplier),
      likes: Math.floor((Math.random() * 200 + 100) * multiplier),
      comments: Math.floor((Math.random() * 50 + 20) * multiplier),
      shares: Math.floor((Math.random() * 30 + 10) * multiplier),
      mentions: Math.floor((Math.random() * 20 + 5) * multiplier),
      impressions: Math.floor((Math.random() * 5000 + 3000) * multiplier),
      activeCampaigns: activeCampaignCount
    });
  }

  return data;
}

// 요약 통계 계산 헬퍼 함수
function calculateSummary(dailyData) {
  const totals = {
    reach: dailyData.reduce((sum, d) => sum + d.reach, 0),
    likes: dailyData.reduce((sum, d) => sum + d.likes, 0),
    comments: dailyData.reduce((sum, d) => sum + d.comments, 0),
    shares: dailyData.reduce((sum, d) => sum + d.shares, 0),
    mentions: dailyData.reduce((sum, d) => sum + d.mentions, 0),
    impressions: dailyData.reduce((sum, d) => sum + d.impressions, 0)
  };

  // 랜덤 변화율 생성 (실제로는 전주 데이터와 비교해야 함)
  const generateChange = () => (Math.random() * 40 - 15).toFixed(1);

  return {
    totalReach: totals.reach,
    totalLikes: totals.likes,
    totalComments: totals.comments,
    totalShares: totals.shares,
    totalMentions: totals.mentions,
    totalImpressions: totals.impressions,
    avgReach: Math.round(totals.reach / dailyData.length),
    avgLikes: Math.round(totals.likes / dailyData.length),
    avgComments: Math.round(totals.comments / dailyData.length),
    // 프론트엔드에서 사용할 필드명
    reach: totals.reach,
    likes: totals.likes,
    comments: totals.comments,
    shares: totals.shares,
    impressions: totals.impressions,
    // 변화율 (전주 대비)
    reachChange: parseFloat(generateChange()),
    likesChange: parseFloat(generateChange()),
    commentsChange: parseFloat(generateChange()),
    sharesChange: parseFloat(generateChange()),
    impressionsChange: parseFloat(generateChange())
  };
}

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

    // 실제 Daily Report DB에서 일간 데이터 가져오기
    let dailyData = await fetchDailyReportData(id, 30);
    if (dailyData.length === 0) {
      dailyData = generateSampleDailyData(campaign.시작일, campaign.종료일);
    }

    // 실제 Mentions DB에서 크리에이터/콘텐츠 데이터 가져오기
    let creators = await fetchMentionsData(id);
    if (creators.length === 0) {
      creators = generateSampleCreators(campaign.참여인원 || 5);
    }

    res.json({
      campaign,
      dailyData,
      creators,
      source: {
        dailyData: dailyData.length > 0 && dailyData[0].videoPlays !== undefined ? 'notion' : 'simulated',
        creators: creators.length > 0 && creators[0].콘텐츠목록 ? 'notion' : 'simulated'
      }
    });
  } catch (error) {
    console.error('Campaign detail error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 샘플 크리에이터 데이터 생성 함수
function generateSampleCreators(count) {
  const creators = [];
  const names = ['김지원', '이서연', '박민수', '최유나', '정하늘', '강도연', '윤서진', '임태호', '송미라', '조은지'];
  const categories = ['헬스', '러닝', '요가', '필라테스', '크로스핏', '다이어트'];
  const statuses = ['콘텐츠 업로드 완료', '촬영 진행 중', '제품 수령 완료', '계약 완료'];

  for (let i = 0; i < Math.min(count, 10); i++) {
    creators.push({
      id: `creator_${i + 1}`,
      이름: names[i % names.length],
      인스타그램: `@creator_${i + 1}`,
      팔로워수: Math.floor(Math.random() * 50000) + 5000,
      활동분야: categories[i % categories.length],
      상태: statuses[Math.floor(Math.random() * statuses.length)],
      콘텐츠: {
        포스팅수: Math.floor(Math.random() * 5) + 1,
        좋아요: Math.floor(Math.random() * 1000) + 100,
        댓글: Math.floor(Math.random() * 100) + 10,
        도달: Math.floor(Math.random() * 10000) + 1000,
        저장: Math.floor(Math.random() * 50) + 5,
        공유: Math.floor(Math.random() * 30) + 2
      },
      등록일: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
  }

  return creators.sort((a, b) => b.콘텐츠.좋아요 - a.콘텐츠.좋아요);
}

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

// ===================== Mentions/크리에이터 API =====================
app.get('/api/mentions', async (req, res) => {
  try {
    const { campaignId } = req.query;
    const creators = await fetchMentionsData(campaignId);

    // 전체 통계 계산
    const totalStats = creators.reduce((acc, c) => {
      acc.totalPosts += c.콘텐츠.포스팅수;
      acc.totalLikes += c.콘텐츠.좋아요;
      acc.totalComments += c.콘텐츠.댓글;
      acc.totalShares += c.콘텐츠.공유;
      acc.totalVideoPlays += c.콘텐츠.비디오재생;
      return acc;
    }, { totalPosts: 0, totalLikes: 0, totalComments: 0, totalShares: 0, totalVideoPlays: 0 });

    res.json({
      creators,
      total: creators.length,
      stats: totalStats,
      source: 'notion'
    });
  } catch (error) {
    console.error('Mentions fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===================== Daily Report API =====================
app.get('/api/daily-report', async (req, res) => {
  try {
    const { campaignId, days } = req.query;
    const dailyData = await fetchDailyReportData(campaignId, parseInt(days) || 7);

    res.json({
      dailyData,
      summary: calculateSummary(dailyData),
      source: 'notion'
    });
  } catch (error) {
    console.error('Daily report fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

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
