/*
 * 手绘图标，路径取自设计稿「温柔版」，原出处 Doodle Icons：https://github.com/oreo-design/doodle-icons
 *
 * MIT License
 *
 * Copyright (c) 2026 Nicole Tang
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import type { SVGProps } from 'react'
import { cn } from '@/lib/utils'

type IconProps = SVGProps<SVGSVGElement>

/** 48×48 画布、圆头描边，颜色跟随文字；尺寸用 size-* 控制 */
function doodle(paths: string[], strokeWidth = 3.8) {
  return function DoodleIcon({ className, ...props }: IconProps) {
    return (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className={cn('size-[18px] shrink-0', className)}
        {...props}
      >
        {paths.map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
    )
  }
}

const CIRCLE = 'M 24 8.5 C 32.8 8.5, 39.5 15.2, 39.5 24 C 39.5 32.8, 32.8 39.5, 24 39.5 C 15.2 39.5, 8.5 32.8, 8.5 24 C 8.5 15.2, 15.2 8.5, 24 8.5 Z'

export const SearchIcon = doodle(
  [
    'M 21 9.6 C 27.6 9.4, 31.8 13.8, 31.6 20.3 C 31.4 26.6, 27 30.6, 20.8 30.4 C 14.7 30.2, 10.6 26, 10.6 19.9 C 10.6 13.9, 14.9 9.8, 21 9.6 Z',
    'M 28.9 28.4 C 31.9 31.4, 34.9 34.5, 37.8 37.7',
  ],
  3.6,
)

/** 选中的筛选标签 */
export const CheckCircleIcon = doodle(
  [CIRCLE, 'M 16.5 24.5 C 18.5 26.7, 20.4 28.9, 22.2 31.2 C 25.3 26.5, 28.6 22, 32 17.6'],
  4,
)

export const ArrowLeftIcon = doodle([
  'M 38.5 24 C 29.5 23.8, 20 23.8, 10.5 24',
  'M 19 15.5 C 16 18.3, 13 21.1, 10.2 24 C 13 26.9, 16 29.7, 19 32.5',
])

export const DownloadIcon = doodle([
  'M 24 8 C 33 8, 40 15, 40 24 C 40 33, 33 40, 24 40 C 15 40, 8 33, 8 24 C 8 15, 15 8, 24 8 Z',
  'M 24 14.5 C 24.3 19, 24.2 23.5, 24 27.8',
  'M 17.8 23.2 C 19.7 26, 21.7 28.5, 24 30.7 C 26.3 28.4, 28.4 25.9, 30.2 23.1',
])
