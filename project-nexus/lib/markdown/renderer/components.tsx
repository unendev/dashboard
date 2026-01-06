/**
 * ReactMarkdown 自定义组件配置
 * 
 * 根据 DesignTokens 生成样式化的 Markdown 元素组件
 */

import React from 'react';
import type { Components } from 'react-markdown';
import type { DesignTokens } from '../tokens/design-tokens';

/**
 * 根据设计 token 创建 ReactMarkdown 自定义组件
 * @param tokens 设计 token 对象
 * @returns ReactMarkdown components 配置
 */
export function createMarkdownComponents(tokens: DesignTokens): Components {
  return {
    // 段落
    p: ({ children }) => (
      <p style={{ 
        marginBottom: '0.5rem',
        lineHeight: 1.6,
        color: tokens.text.primary,
      }}>
        {children}
      </p>
    ),

    // 标题
    h1: ({ children }) => (
      <h1 style={{
        fontSize: '1.125rem',
        fontWeight: 700,
        marginBottom: '0.5rem',
        marginTop: '1rem',
        borderBottom: `1px solid ${tokens.text.muted}`,
        paddingBottom: '0.25rem',
        color: tokens.heading.h1,
      }}>
        {children}
      </h1>
    ),

    h2: ({ children }) => (
      <h2 style={{
        fontSize: '1rem',
        fontWeight: 700,
        marginBottom: '0.5rem',
        marginTop: '0.75rem',
        color: tokens.heading.h2,
      }}>
        {children}
      </h2>
    ),

    h3: ({ children }) => (
      <h3 style={{
        fontSize: '0.875rem',
        fontWeight: 700,
        marginBottom: '0.25rem',
        marginTop: '0.5rem',
        color: tokens.heading.h3,
      }}>
        {children}
      </h3>
    ),

    // 列表
    ul: ({ children }) => (
      <ul style={{
        listStyleType: 'disc',
        marginLeft: '1rem',
        marginBottom: '0.5rem',
        color: tokens.list.text,
      }}>
        {children}
      </ul>
    ),

    ol: ({ children }) => (
      <ol style={{
        listStyleType: 'decimal',
        marginLeft: '1rem',
        marginBottom: '0.5rem',
        color: tokens.list.text,
      }}>
        {children}
      </ol>
    ),

    li: ({ children }) => (
      <li style={{ color: tokens.list.text }}>
        {children}
      </li>
    ),

    // 引用
    blockquote: ({ children }) => (
      <blockquote style={{
        borderLeft: `2px solid ${tokens.blockquote.border}`,
        paddingLeft: '0.75rem',
        fontStyle: 'italic',
        color: tokens.blockquote.text,
        marginTop: '0.5rem',
        marginBottom: '0.5rem',
        backgroundColor: tokens.blockquote.background,
        paddingTop: '0.25rem',
        paddingBottom: '0.25rem',
        paddingRight: '0.25rem',
        borderRadius: '0 0.25rem 0.25rem 0',
      }}>
        {children}
      </blockquote>
    ),

    // 代码
    code: ({ children, className }) => {
      const isInline = !className;
      if (isInline) {
        return (
          <code style={{
            backgroundColor: tokens.code.background,
            padding: '0.125rem 0.25rem',
            borderRadius: '0.25rem',
            fontSize: '0.75rem',
            fontFamily: 'monospace',
            color: tokens.code.text,
          }}>
            {children}
          </code>
        );
      }
      return (
        <code style={{
          display: 'block',
          backgroundColor: tokens.code.background,
          padding: '0.75rem',
          borderRadius: '0.5rem',
          fontSize: '0.75rem',
          fontFamily: 'monospace',
          color: tokens.code.text,
          overflowX: 'auto',
          marginTop: '0.5rem',
          marginBottom: '0.5rem',
          border: `1px solid ${tokens.code.border}`,
        }}>
          {children}
        </code>
      );
    },

    pre: ({ children }) => (
      <pre style={{ margin: 0 }}>
        {children}
      </pre>
    ),

    // 链接
    a: ({ children, href }) => (
      <a 
        href={href} 
        target="_blank" 
        rel="noopener noreferrer"
        style={{
          color: tokens.link.color,
          textDecoration: 'none',
        }}
      >
        {children}
      </a>
    ),

    // 粗体
    strong: ({ children }) => (
      <strong style={{ 
        fontWeight: 600,
        color: tokens.text.primary,
      }}>
        {children}
      </strong>
    ),

    // 斜体
    em: ({ children }) => (
      <em style={{ 
        fontStyle: 'italic',
        color: tokens.text.secondary,
      }}>
        {children}
      </em>
    ),

    // 水平线
    hr: () => (
      <hr style={{
        border: 'none',
        borderTop: `1px solid ${tokens.text.muted}`,
        marginTop: '1rem',
        marginBottom: '1rem',
      }} />
    ),
  };
}
