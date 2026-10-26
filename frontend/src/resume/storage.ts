const PHOTO_KEY = "career-os.resume.photo";
const DOCUMENT_KEY = "career-os.resume.document";
const TEMPLATE_KEY = "career-os.resume.template";

export type ResumeTemplate = "classic" | "clean" | "warm";

export type ResumeEntry = {
  title: string;
  organization: string;
  period: string;
  location?: string;
  bullets: string[];
};

export type ResumeDocument = {
  name: string;
  headline: string;
  phone: string;
  email: string;
  address: string;
  birthday: string;
  summary: string;
  experience: ResumeEntry[];
  projects: ResumeEntry[];
  school: string;
  educationPeriod: string;
  degree: string;
  major: string;
  courses: string;
  awards: string[];
  campus: ResumeEntry[];
  selfSummary: string[];
};

const defaultDocument: ResumeDocument = {
  name: "门璐",
  headline: "AI 应用 · 数据可视化 · 前端开发",
  phone: "15114962153",
  email: "AROCS8-8@outlook.com",
  address: "北京市朝阳区东四环",
  birthday: "2003 年 05 月",
  summary:
    "智能科学与技术专业背景，具备 AI 应用、数据可视化与前端开发实践经验；持续将模型能力、数据处理和交互体验落为可交付的产品与项目。",
  experience: [
    {
      title: "前端工程师（实习）",
      organization: "北京至顶网信息技术有限公司",
      period: "2023.01 - 2023.03",
      location: "北京",
      bullets: [
        "根据设计稿编写静态页面代码，对 CSS 样式进行细致调整，优化页面视觉效果。",
        "使用微信小程序开发工具，深入学习并实践 HTML、CSS 和 JavaScript；页面布局合理、样式美观且功能实现准确无误。",
        "在 GitHub 和 Gitee 平台上创建并维护项目仓库，定期提交代码更新。",
      ],
    },
    {
      title: "数据可视化开发（实习）",
      organization: "山西汇宏鑫信息技术有限公司",
      period: "2024.08 - 2024.11",
      location: "山西",
      bullets: [
        "使用 ECharts 开发交互式数据看板，集成折线图、柱状图、地图等 10+ 种图表。",
        "使用 Pandas 处理 Excel/CSV 数据，清洗异常值并转换格式，确保数据准确性。",
        "参与用户调研，根据反馈优化图表交互，如添加工具提示、数据缩放功能。",
        "主导“用户行为分析”模块开发，通过热力图展示点击分布，辅助产品经理优化页面布局。",
      ],
    },
    {
      title: "AI 运营（实习）",
      organization: "山西数据流量谷 AI",
      period: "2025.03 - 2025.08",
      location: "山西",
      bullets: [
        "构建垂直领域 AI 学习社群，不定期更新互联网资讯、专业知识讲解与 AI 工具应用。",
        "设计“AI 名称解析”“AI 智能体应用”“AI 在各行业的发展场景”等互动机制，活跃用户 50+。",
        "开展“每周晚 AI 实战直播”栏目，主讲《ChatGPT 提示词优化》《AI 工具的使用方法与场景》等课程，覆盖文生文、文生图、文生视频及其他垂直领域 AI 产品。",
      ],
    },
  ],
  projects: [
    {
      title: "AI 创作古诗辅助教学",
      organization: "项目经历",
      period: "2025.04 - 2025.06",
      bullets: [
        "对比千帆大模型和星火大模型在诗句生成、图片生成中的表现，选定 ERNIE-Speed-8K 与 HiDream 图片生成 + 提示词设定的组合技术方案。",
        "基于 Flask 搭建交互界面，设计“主题选择 → 关键词输入 → 诗句生成 → 背景图联动”四步流程，支持小学、初中、高中分龄教学。",
        "调用文心一言 API（/v1/poem_generation）生成押韵古诗；提示词包含主题、情感、字数、朝代风格四要素，例如“春天，喜悦，七言绝句，唐代风格”，并用星火大模型生成背景图。",
      ],
    },
    {
      title: "PE 提示词优化",
      organization: "项目经历",
      period: "2025.03 - 2025.06",
      bullets: [
        "初期使用 Claude 3.5 Sonnet 进行原型验证，通过动态提示词调整完成复杂任务拆解，例如将用户需求分解为 3 个可执行子任务，每步包含输入输出示例。",
        "设定 temperature 和上下文检索长度，对长文本生成任务启用流式输出。",
        "为降低成本采用千问 32B 进行结构化提示词编写，包括角色设定、参数设定、条件限制等，并加工已知数据集。",
        "对已知数据集做去重、格式标准化等预处理，在 Dify 平台将非结构化数据转换为模型可理解的 JSON 格式。",
        "推理成本降低 60%，准确率达 92% 以上；数据先经人工初次核验，再由脚本进行核验检查。",
      ],
    },
    {
      title: "基于大语言模型中医智能交互系统",
      organization: "项目经历",
      period: "2024.08 - 2024.11",
      bullets: [
        "主导制定项目方案，明确“中医知识普及 + 大语言模型 + BERT”多目标：大语言模型负责复杂诊疗推理，BERT 优化短文本问答，问答响应准确率提升 40%。",
        "针对中医场景设计结构化提示词，例如用户描述“失眠”时，模型需按“心脾两虚”“肝火扰心”等证型解析并推荐对应食疗方案；通过 A/B 测试优化提示词权重，用户满意度提升 30%。",
        "利用 BERT 对中医古籍、方剂数据库进行向量化处理，支持“症状 - 证型 - 方剂”关联查询，检索准确率达 85%。",
        "收集中医术语库 8 万+ 条目，涵盖开源数据集和网络爬取数据；模型对专业文本的语义理解误差率降低至 12% 以下。",
      ],
    },
  ],
  school: "太原学院",
  educationPeriod: "2021 - 2025",
  degree: "本科",
  major: "智能科学与技术",
  courses:
    "C/C++、Python、数据库、Web 开发、操作系统、机器学习、Python 数据挖掘、云计算等。",
  awards: [
    "2025 届山西省优秀毕业论文",
    "2025 年 C1 驾驶证",
    "2024-2025 学年“睿抗机器人开发者大赛”山西赛区一等奖、国赛三等奖",
    "2023-2024 学年第十七届“中国大学生计算机设计大赛”山西省赛区一等奖、国赛三等奖",
    "2022-2023 学年“全国大学生电子设计大赛”山西省赛区二等奖",
    "2023-2024 学年“全国大学生数学建模大赛”山西省赛区三等奖",
    "2023-2024 学年“大学生创新创业训练计划项目”省级立项三次",
    "2023-2024 学年第十五届“蓝桥杯全国软件和信息技术专业人才大赛”山西省赛区三等奖",
    "2023-2024 学年“中国机器人及人工智能大赛”山西省赛区三等奖",
    "2023-2024 学年软件著作权一项",
    "2023-2024 学年太原市马拉松优秀志愿者",
  ],
  campus: [
    {
      title: "智能感知实验室成员",
      organization: "校园经历",
      period: "2023.05 - 毕业",
      bullets: [
        "专注软件方向研究与嵌入式开发，获得实践经验和技能；编程能力、沟通能力和协作能力得到提高。",
      ],
    },
    {
      title: "国旗护卫队副队长",
      organization: "校园经历",
      period: "2022.11 - 毕业",
      bullets: [
        "曾任国旗护卫队组织组组长，现升任副队长，负责团队活动组织与协调。",
      ],
    },
    {
      title: "女子篮球队成员",
      organization: "校园经历",
      period: "2021.10 - 毕业",
      bullets: [
        "参加篮球比赛，培养团队合作精神与竞技精神；为球队赢得校级冠军一次、季军三次。",
      ],
    },
  ],
  selfSummary: [
    "学习上：勤奋刻苦、认真好学、脚踏实地，能不断充实专业知识，并主动吸收新知识。",
    "生活上：活泼开朗、E 人、乐观向上，爱好体育运动（全马完赛，斯巴达勇士赛备赛中）；适应力强、坚忍不拔、吃苦耐劳，勇于迎接新事务。",
    "工作上：具有较强的团队管理能力、独立问题解决能力和执行能力；责任心强，具备良好的沟通能力和团队合作意识。",
  ],
};

function copyDefault() {
  return JSON.parse(JSON.stringify(defaultDocument)) as ResumeDocument;
}

export function readResumeDocument(): ResumeDocument {
  try {
    const value = JSON.parse(localStorage.getItem(DOCUMENT_KEY) ?? "null");
    if (
      value &&
      typeof value === "object" &&
      typeof value.name === "string" &&
      Array.isArray(value.experience)
    )
      return value as ResumeDocument;
  } catch {
    // Ignore malformed local data and restore the imported resume.
  }
  return copyDefault();
}

export function saveResumeDocument(value: ResumeDocument) {
  localStorage.setItem(DOCUMENT_KEY, JSON.stringify(value));
}
export function readResumeTemplate(): ResumeTemplate {
  const value = localStorage.getItem(TEMPLATE_KEY);
  return value === "clean" || value === "warm" || value === "classic"
    ? value
    : "classic";
}
export function saveResumeTemplate(value: ResumeTemplate) {
  localStorage.setItem(TEMPLATE_KEY, value);
}
export function readResumePhoto() {
  return localStorage.getItem(PHOTO_KEY);
}
export function saveResumePhoto(value: string) {
  localStorage.setItem(PHOTO_KEY, value);
}

export function exportResumeData() {
  return {
    document: readResumeDocument(),
    template: readResumeTemplate(),
    photo: readResumePhoto(),
  };
}
