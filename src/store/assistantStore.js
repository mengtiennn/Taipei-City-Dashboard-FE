import { ref, reactive } from 'vue'
import { defineStore } from 'pinia'
import dayjs from 'dayjs'
export const useAssistant = defineStore('assistant', () => {
	const textScript = reactive([
		// { content: '<span>我想知道台北市哪裡較常發生交通事故</span>', time: dayjs(new Date()).format('HH:mm') },
		// { content: '<div style="display: flex; gap:2px;">目前以強盜、搶奪、汽機車竊盜和住宅竊盜次數等分析結果來看，</div><div style="margin-top: 5px;display: flex; gap: 9px; cursor: pointer; align-items: center;"><span style="color: #9E8EFF; font-weight: 700; font-size: 14px;" >查看圖表</span><span style="color: #9E8EFF; font-weight: 700; font-size: 14px;" >匯入列表中查看</span></div>', time: dayjs(new Date()).format('HH:mm') },
		// { content: '<span>我想知道台北市哪裡是犯罪熱區</span>', time: '12:34' },
		// { content: '<div style="display: flex; gap:2px;">目前台北市共有130間派出所</div><div style="margin-top: 5px;display: flex; gap: 9px; cursor: pointer; align-items: center;"><span style="color: #9E8EFF; font-weight: 700; font-size: 14px;" >查看圖表</span></div>', time: '12:35' },
		// { content: '<span>我想知道台北市哪裡是犯罪熱區</span>', time: '12:34' },
		// { content: '<div style="display: flex; gap:2px;">目前台北市共有130間派出所</div><div style="margin-top: 5px;display: flex; gap: 9px; cursor: pointer; align-items: center;"><span style="color: #9E8EFF; font-weight: 700; font-size: 14px;" >查看圖表</span></div>', time: '12:35' },
		// { content: '<span>我想知道台北市哪裡是犯罪熱區</span>', time: '12:34' },
		// { content: '<div style="display: flex; gap:2px;">目前台北市共有130間派出所</div><div style="margin-top: 5px;display: flex; gap: 9px; cursor: pointer; align-items: center;"><span style="color: #9E8EFF; font-weight: 700; font-size: 14px;" >查看圖表</span></div>', time: '12:35' },
	])
	return {
		textScript
	}
})
