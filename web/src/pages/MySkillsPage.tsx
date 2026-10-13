import { Link } from 'react-router'
import { useSearchSkills } from '@/api/queries'
import { useIdentity } from '@/auth/identity'
import { PageHeader } from '@/components/PageHeader'
import { SkillList } from '@/components/SkillList'
import { StatusMessage } from '@/components/StatusMessage'
import { Button } from '@/components/ui/button'
import { PAGE_SIZE, useListParams } from '@/lib/searchParams'

function MySkillList() {
  const { page, update } = useListParams()
  const query = useSearchSkills({ user_id: 'me', page, size: PAGE_SIZE })
  return (
    <div className="space-y-6">
      <PageHeader
        title="我的技能"
        // 03 §8.4：技能级下架后 user_id=me 也列不出
        description="你上传的全部技能，含私有。已下架的技能不在这里，可以通过详情页地址查看。"
        count={query.data?.total}
        countLabel="个技能"
      />
      <SkillList
        query={query}
        onPageChange={(p) => update({ page: p })}
        empty="你还没有上传过技能"
        emptyAction={
          <Button asChild>
            <Link to="/upload">上传技能</Link>
          </Button>
        }
      />
    </div>
  )
}

export function MySkillsPage() {
  const userId = useIdentity((s) => s.userId)
  if (userId) return <MySkillList />
  return (
    <div className="space-y-6">
      <PageHeader title="我的技能" />
      <StatusMessage>登录后可以查看自己上传的技能</StatusMessage>
    </div>
  )
}
