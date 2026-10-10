import { Link, useRouteError } from 'react-router'
import { StatusMessage } from '@/components/StatusMessage'

export function NotFoundPage() {
  return (
    <StatusMessage>
      页面不存在。<Link to="/" className="underline">回到首页</Link>
    </StatusMessage>
  )
}

/** 渲染期未捕获的异常 */
export function RouteError() {
  console.error(useRouteError())
  return (
    <div className="p-8">
      <StatusMessage>
        页面出错了。<Link to="/" className="underline">回到首页</Link>
      </StatusMessage>
    </div>
  )
}
