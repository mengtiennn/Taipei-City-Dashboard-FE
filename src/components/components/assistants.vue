<!-- audio/text assistants -->

<script setup>
import { ref, computed } from 'vue'
import { useMapStore } from '../../store/mapStore'
import { useDialogStore } from '../../store/dialogStore'
import conversation from '../components/conversation.vue'
import { useAssistant } from '../../store/assistantStore'
import { useSpeechSynthesis } from '@vueuse/core'
import dayjs from 'dayjs'
const mapStore = useMapStore()
const dialogStore = useDialogStore()
const assistant = useAssistant()
const checked = ref(false)
const textVal = ref('')
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
const speechR = new Recognition()
const recorderTxt = ref('')
const voice = ref(null)
const text = ref('目前顯示三至四個月前的交通事故統計及熱力圖，資料來源為台北市交通局內部資料')
const text2 = ref('目前顯示三至四個月前的交通事故統計及熱力圖，資料來源為台北市交通局內部資料')
const text3 = ref('目前顯示三至四個月前的交通事故統計及熱力圖，資料來源為台北市交通局內部資料')
const text4 = ref('聽不清楚，請再說一次')
const pitch = ref(1)
const rate = ref(1)
const lang = ref('zh-TW')
const speech = useSpeechSynthesis(text, {
  lang,
  voice,
  pitch,
  rate
})
const speech2 = useSpeechSynthesis(text2, {
  lang,
  voice,
  pitch,
  rate
})
const speech3 = useSpeechSynthesis(text3, {
  lang,
  voice,
  pitch,
  rate
})
const speech4 = useSpeechSynthesis(text4, {
  lang,
  voice,
  pitch,
  rate
})
const sendQuestion = () => {
	assistant.textScript.push({ content: `<span>${textVal.value}</span>`, time: dayjs(new Date()).format('HH:mm') }, { content: '<div style="display: flex; gap:2px;">目前顯示三至四個月前的交通事故統計及熱力圖，資料來源為台北市交通局內部資料</div><div style="margin-top: 5px;display: flex; gap: 9px; cursor: pointer; align-items: center;"><span style="color: #9E8EFF; font-weight: 700; font-size: 14px;" >查看圖表</span><span style="color: #9E8EFF; font-weight: 700; font-size: 14px;" >匯入列表中查看</span></div>', time: dayjs(new Date()).format('HH:mm') })
}
const startTTS = () => {
  speechR.start()
  speechR.onresult = (evt) => {
    const t = Array.from(evt.results)
      .map(result => result[0])
      .map(result => result.transcript)
      .join('')
    recorderTxt.value = t
    textVal.value = recorderTxt.value
  }
  speechR.onend = () => {
    // console.log('SR Stopped', recorderTxt)
    // status.inVoiceMode = false
    if (recorderTxt.value == '') {
      assistant.textScript.push({ content: `<span>${recorderTxt.value}</span>`, time: dayjs(new Date()).format('HH:mm') }, { content: `<span>聽不清楚，請再說一次</span>`, time: dayjs(new Date()).format('HH:mm') })
    } else if (recorderTxt.value != '') {
      judge()
    } else {
      return
    }
  }
}
const playRequest = (sp) => {
  if (sp.status.value === 'pause') {
    console.log('resume')
    window.speechSynthesis.resume()
  }
  else {
    sp.speak()
  }
}
const judge = () => {
  const keywordsA = ['交通事故']
  const keywordsB = ['']
  const keywordsC = ['']

  for (let i = 0; i < keywordsA.length; i++) {
    if (recorderTxt.value.includes(keywordsA[i])) {
      console.log("題目一")
      assistant.textScript.push({ content: `<span>${recorderTxt.value}</span>`, time: dayjs(new Date()).format('HH:mm') }, { content: `<span>目前顯示三至四個月前的交通事故統計及熱力圖，資料來源為台北市交通局內部資料</span>`, time: dayjs(new Date()).format('HH:mm') })
      // setTimeout(() => {
      //   status.scrollVal = conversationD.value.scrollHeight
      //   conversationD.value.scrollTo({
      //     top: status.scrollVal + 100,
      //     behavior: "smooth",
      //   })
      // }, 500)
      playRequest(speech)
      return
    }
  }
}
</script>

<template>
  <div class="assistantWrapper" :class="{ checked: checked }">
    <div class="assistantWrapper-header">
      <div>
        <div>
          <h3>語音助理</h3>
          <span @click="dialogStore.showNotification('info', '開啟使用語音助理功能，尋找圖表資訊更便利')">info</span>
        </div>
      </div>
      <div class="assistantWrapper-header-toggle">
        <label class="toggleswitch">
          <input type="checkbox" @change="handleToggle" v-model="checked">
          <span class="toggleswitch-slider"></span>
        </label>
      </div>
    </div>
    <div class="assistantWrapper-opened" v-if="checked">
      <div class="assistantWrapper-content">
        <conversation/>
      </div>
      <div class="assistantWrapper-textOrAudio">
        <img src="../../assets/images/Mic.svg" alt="mic" @click="startTTS()">
        <div class="assistantWrapper-circle"></div>
        <input type="text" v-model="textVal">
        <img src="../../assets/images/Vector.svg" alt="send" @click="sendQuestion()">
      </div>
    </div>
    <!-- <div v-else-if="checked" class="componentmapchart-loading">
      <div></div>
    </div> -->
  </div>
</template>

<style scoped lang="scss">
.assistantWrapper {
  width: calc(100% - var(--font-m) *2);
  max-width: calc(100% - var(--font-m) *2);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  padding: var(--font-m);
  border-radius: 5px;
  background-color: var(--color-component-background);

  &-circle {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background-color: red;
  }

  &-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;

    h3 {
      font-size: var(--font-m);
    }

    h4 {
      color: var(--color-complement-text);
      font-size: var(--font-s);
      font-weight: 400;
    }

    div:first-child {
      div {
        display: flex;
        align-items: center;
      }

      span {
        margin-left: 8px;
        color: var(--color-complement-text);
        font-family: var(--font-icon);
        user-select: none;
      }
    }

    &-toggle {
      min-height: 1rem;
      min-width: 2rem;
      margin-top: 4px;
    }
  }

  &-control {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    position: absolute;
    top: 4rem;
    left: 0;
    z-index: 10;

    button {
      margin: 0 4px;
      padding: 4px 4px;
      border-radius: 5px;
      background-color: rgb(77, 77, 77);
      opacity: 0.25;
      color: var(--color-complement-text);
      font-size: var(--font-s);
      text-align: center;
      ;
      transition: color 0.2s, opacity 0.2s;

      &:hover {
        opacity: 1;
        color: white;
      }
    }
  }

  &-opened,
  &-loading {
    height: 90%;
    // position: relative;
    // overflow-y: scroll;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  &-loading {
    display: flex;
    align-items: center;
    justify-content: center;

    div {
      width: 2rem;
      height: 2rem;
      border-radius: 50%;
      border: solid 4px var(--color-border);
      border-top: solid 4px var(--color-highlight);
      animation: spin 0.7s ease-in-out infinite;
    }
  }

  &-content {
    width: 100%;
    height: 85%;
    overflow-y: scroll;
  }
  &-textOrAudio {
    border-radius: 5px;
    width: 100%;
    height: 13%;
    background-color: #1e1e22;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 8px;
    box-sizing: border-box;
    >input {
      width: 75%;
    }
    >img {
      cursor: pointer;
    }
  }
}

.checked {
  // max-height: 300px;
  // height: 300px;
  height: 500px;
}
</style>