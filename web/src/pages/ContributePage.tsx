import { ArrowRight, FileText, Rocket, Tags, Upload } from 'lucide-react'
import { Link } from 'react-router'
import { Container, PageHero } from '@/components/Page'
import { Button } from '@/components/ui/button'
import { SCENES } from '@/lib/tags'

const STEPS = [
  { icon: FileText, title: '准备技能', text: '按规范编写 SKILL.md' },
  { icon: Tags, title: '选择标签', text: '场景、学段、学科' },
  { icon: Upload, title: '上传 zip', text: '登录后在上传页提交' },
  { icon: Rocket, title: '即刻发布', text: '上传即发布，无需审核' },
]

/** 每个场景能贡献什么，给老师一些具体的灵感 */
const IDEAS: Record<(typeof SCENES)[number]['key'], string[]> = {
  teaching: ['单元教学设计', '课堂活动与提问', '分层作业', '跨学科项目'],
  learning: ['错题整理', '学习计划', '知识点讲解', '阅读陪练'],
  management: ['班级管理', '家校沟通', '活动方案', '通知撰写'],
  assessment: ['评分量规', '作文评语', '学情分析', '试卷讲评'],
  research: ['课题申报', '文献综述', '教研报告', '课堂观察'],
}

export function ContributePage() {
  return (
    <>
      <PageHero
        title="贡献教育技能"
        description="每一份好教案、每一套评价量规、每一个班级管理妙招，都可以成为帮助更多老师和学生的技能。"
      />
      <Container className="grid gap-12 pt-10">
        <section aria-labelledby="flow" className="grid gap-6">
          <h2 id="flow" className="type-page">
            贡献流程
          </h2>
          <div className="hero-band grid gap-8 surface-card px-6 py-10">
            <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map(({ icon: Icon, title, text }, i) => (
                <li key={title} className="relative grid justify-items-center gap-2 text-center">
                  {/* 步骤之间的连线，只在一行四步时画 */}
                  {i > 0 && (
                    <span aria-hidden className="absolute top-7 right-[calc(50%+44px)] hidden h-px w-[calc(100%-56px)] bg-line-dashed lg:block" />
                  )}
                  <span className="grid size-14 place-items-center rounded-full bg-wash text-signal">
                    <Icon aria-hidden className="size-6" />
                  </span>
                  <h3 className="mt-2 text-lg font-bold">{title}</h3>
                  <p className="type-body-sm text-ink-muted">{text}</p>
                </li>
              ))}
            </ol>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link to="/upload">上传技能</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/guide#contribute">查看贡献指南</Link>
              </Button>
            </div>
          </div>
        </section>

        <section aria-labelledby="ideas" className="grid gap-6">
          <div className="grid gap-1">
            <h2 id="ideas" className="type-page">
              可以贡献什么
            </h2>
            <p className="type-body text-ink-muted">按「教学、学习、管理、评价、科研」五个场景，看看别人已经分享了哪些。</p>
          </div>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
            {SCENES.map((s) => (
              <li key={s.key} className="flex flex-col gap-3 surface-card p-5">
                <h3 className="text-lg font-bold">{s.label}</h3>
                <ul className="flex flex-wrap gap-1.5">
                  {IDEAS[s.key].map((idea) => (
                    <li key={idea} className="inline-flex h-6 items-center rounded-tag bg-panel px-2 text-xs text-ink-muted">
                      {idea}
                    </li>
                  ))}
                </ul>
                <Link to={`/?scene=${s.key}`} className="focus-ring link-text mt-auto inline-flex items-center gap-1 self-start rounded-control">
                  浏览{s.label}技能
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </Container>
    </>
  )
}
