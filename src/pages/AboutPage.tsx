import Header from '../components/Header';

function AboutPage() {
  return (
    <div className="min-h-screen bg-cream">
      <Header back={{ to: '/', label: '返回商品列表' }} />

      <section className="border-b border-forest-100 bg-forest-50">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center sm:py-20">
          <p className="font-display text-sm tracking-[0.3em] text-forest-500">ABOUT US</p>
          <h1 className="mt-4 font-display text-3xl font-semibold text-forest-900 sm:text-4xl">
            關於我們
          </h1>
        </div>
      </section>

      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="space-y-6 text-lg leading-relaxed text-forest-700">
          <p>
            南都植意塊根多肉，源自於台南的塊根多肉品牌。
          </p>
          <p>
            我們是植物培育選拔的人，不是單純的商人——每一株植物，從播種、育苗到成株，
            都經過長時間的照顧與挑選，希望交到你手上的，是真正養得起、養得好的健康植株。
          </p>
          <p>
            我們相信，養植物不只是買一盆擺著好看，而是一段陪伴的過程。
            希望透過我們的用心栽培，讓每一位顧客都能在自己的空間裡，
            養出屬於自己的綠意角落。
          </p>
        </div>
      </main>
    </div>
  );
}

export default AboutPage;
