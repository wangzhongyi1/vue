/* @flow */

import { addProp } from '../../../../compiler/helpers'
// import { addProp } from 'compiler/helpers'

/**
 * 初始化指令 v-html
 * @param {ASTElement} el 
 * @param {ASTDirective} dir 
 */
export default function html (el: ASTElement, dir: ASTDirective) {
  if (dir.value) {
    addProp(el, 'innerHTML', `_s(${dir.value})`)
  }
}
