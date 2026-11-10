import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="nw-page nw-notfound-page">
      <div className="nw-container">
        <div className="nw-notfound-card">
          <span className="nw-kicker">LOST SIGNAL — 404</span>
          <h1>这页还没有被生成</h1>
          <p>你访问的页面不存在，或者它已经被移动。回到工作台继续创作。</p>
          <div className="nw-notfound-actions">
            <Link href="/workbench" className="nw-btn nw-btn-primary">返回工作台</Link>
            <Link href="/inspiration" className="nw-btn nw-btn-secondary">去灵感库</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
