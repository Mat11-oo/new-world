'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="nw-page nw-notfound-page">
      <div className="nw-container">
        <div className="nw-notfound-card">
          <span className="nw-kicker">SYSTEM FAULT</span>
          <h1>工作台暂时失去响应</h1>
          <p>页面渲染时发生异常。可以重试当前页面，或返回工作台重新开始。</p>
          <div className="nw-notfound-actions">
            <button type="button" className="nw-btn nw-btn-primary" onClick={reset}>重试</button>
            <Link href="/workbench" className="nw-btn nw-btn-secondary">返回工作台</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
