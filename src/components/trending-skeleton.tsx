export default function TrendingSkeleton() {
  return <div className="trending-loading" role="status">
    <span className="trending-loading-label">Loading categories and trending brackets…</span>
    <div aria-hidden="true">
      <div className="trending-picker">
        <span className="trending-picker-label">Category</span>
        <div className="trending-picker-trigger trending-skeleton-select">
          <span className="trending-skeleton-block trending-skeleton-selection" />
          <span className="trending-skeleton-block trending-skeleton-chevron" />
        </div>
      </div>
      <div className="trending-category">
        <div className="trending-category-heading trending-skeleton-heading">
          <span className="trending-skeleton-block trending-skeleton-category" />
          <span className="trending-skeleton-block trending-skeleton-window" />
        </div>
        <div className="trending-rankings">
          {[0, 1].map(index => <div className="trending-item trending-skeleton-item" key={index}>
            <span className="trending-skeleton-block trending-skeleton-rank" />
            <span className="trending-skeleton-block trending-skeleton-trophy" />
            <div className="trending-item-copy">
              <span className="trending-skeleton-block trending-skeleton-title" />
              <span className="trending-skeleton-block trending-skeleton-meta" />
              <span className="trending-skeleton-block trending-skeleton-contenders" />
            </div>
          </div>)}
        </div>
      </div>
    </div>
  </div>;
}
