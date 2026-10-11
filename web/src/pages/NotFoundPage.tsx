import { Link, useRouteError } from 'react-router'
import { StatusMessage } from '@/components/StatusMessage'
import { Button } from '@/components/ui/button'

const backHome = (
  <Button variant="outline" size="sm" asChild>
    <Link to="/">回到首页</Link>
  </Button>
)

export function NotFoundPage() {
  return <StatusMessage action={backHome}>页面不存在</StatusMessage>
}

/** 渲染期未捕获的异常 */
export function RouteError() {
  console.error(useRouteError())
  return (
    <div className="p-8">
      <StatusMessage action={backHome}>页面出错了</StatusMessage>
    </div>
  )
}
