import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Нууцлалын бодлого | SHOPTOOL.mn',
  description:
    'SHOPTOOL.mn болон DIY Store, DIY Нийлүүлэгч, DIY Store Жолооч аппликэйшнүүдийн хувийн мэдээлэл цуглуулах, ашиглах, хамгаалах бодлого.',
};

const UPDATED = '2026 оны 6-р сарын 13';
const CONTACT_EMAIL = 'support@shoptool.mn';

// ─── Section helper ───────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-3">{title}</h2>
      <div className="space-y-3 text-foreground-muted text-sm sm:text-base leading-relaxed">
        {children}
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-dark">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[var(--glass-border)]">
        <div className="absolute inset-0 gradient-mesh opacity-50" />
        <div className="relative mx-auto max-w-3xl px-4 py-14 text-center">
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-3">
            Нууцлалын <span className="gradient-text">бодлого</span>
          </h1>
          <p className="text-foreground-muted text-sm">Сүүлд шинэчилсэн: {UPDATED}</p>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-foreground-muted text-sm sm:text-base leading-relaxed mb-10">
          Энэхүү нууцлалын бодлого нь <strong className="text-foreground">SHOPTOOL.mn</strong> вэб
          платформ болон <strong className="text-foreground">DIY Store</strong> (хэрэглэгч),{' '}
          <strong className="text-foreground">DIY Нийлүүлэгч</strong>,{' '}
          <strong className="text-foreground">DIY Store Жолооч</strong> гар утасны
          аппликэйшнүүдэд хамаарна. Бид таны хувийн мэдээллийг хэрхэн цуглуулж, ашиглаж,
          хамгаалдгийг доор тайлбарласан болно.
        </p>

        <Section title="1. Бидний цуглуулдаг мэдээлэл">
          <p>Үйлчилгээний төрлөөс хамаарч дараах мэдээллийг цуглуулж болно:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="text-foreground">Бүртгэлийн мэдээлэл</strong> — нэр, и-мэйл хаяг,
              утасны дугаар. Нэвтрэхэд нэг удаагийн код (OTP) ашиглана.
            </li>
            <li>
              <strong className="text-foreground">Хүргэлтийн мэдээлэл</strong> — хүргэлтийн хаяг,
              захиалгын дэлгэрэнгүй.
            </li>
            <li>
              <strong className="text-foreground">Байршлын мэдээлэл</strong> — хүргэлтийн хаягийг
              газрын зураг дээр харуулах болон захиалгын явцыг хянахад ашиглана. Жолоочийн аппад
              хүргэлтийн үед бодит цагийн байршлыг ашиглана.
            </li>
            <li>
              <strong className="text-foreground">Зураг ба камер</strong> — Нийлүүлэгчийн аппад
              бараа бүтээгдэхүүний зургийг камераар авах эсвэл цомгоос сонгоход ашиглана.
            </li>
            <li>
              <strong className="text-foreground">Төлбөрийн мэдээлэл</strong> — төлбөрийг QPay,
              MonPay болон картын үйлчилгээ үзүүлэгчдээр дамжуулан гүйцэтгэнэ. Бид картын бүрэн
              дугаарыг хадгалдаггүй.
            </li>
            <li>
              <strong className="text-foreground">Төхөөрөмжийн мэдээлэл</strong> — апп ажиллуулахад
              шаардлагатай техникийн мэдээлэл, мэдэгдэл (notification) илгээх зориулалтаар.
            </li>
          </ul>
        </Section>

        <Section title="2. Мэдээллийг хэрхэн ашиглах">
          <ul className="list-disc pl-5 space-y-2">
            <li>Захиалга боловсруулах, хүргэлт зохион байгуулах</li>
            <li>Нэвтрэлт, бүртгэл баталгаажуулах</li>
            <li>Захиалгын явц, хүргэлтийн төлөвийг бодит цагт мэдээлэх</li>
            <li>Хэрэглэгчийн дэмжлэг үзүүлэх, асуудал шийдвэрлэх</li>
            <li>Үйлчилгээний чанарыг сайжруулах</li>
          </ul>
        </Section>

        <Section title="3. Мэдээлэл хуваалцах">
          <p>
            Бид таны хувийн мэдээллийг гуравдагч этгээдэд зарж борлуулдаггүй. Үйлчилгээ үзүүлэхэд
            шаардлагатай тохиолдолд дараах талуудтай хязгаарлагдмал хэмжээгээр хуваалцана:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Нийлүүлэгч, жолооч — захиалга биелүүлэх, хүргэлт гүйцэтгэх зорилгоор</li>
            <li>Төлбөрийн үйлчилгээ үзүүлэгч (QPay, MonPay, банк) — гүйлгээ хийх</li>
            <li>Газрын зургийн үйлчилгээ (Google Maps) — байршил, маршрут харуулах</li>
            <li>Хууль, эрх бүхий байгууллагын шаардлагаар</li>
          </ul>
        </Section>

        <Section title="4. Мэдээллийн хадгалалт ба аюулгүй байдал">
          <p>
            Таны мэдээллийг үйлчилгээ үзүүлэхэд шаардлагатай хугацаанд хадгална. Бид мэдээллийг
            зөвшөөрөлгүй хандалт, алдагдлаас хамгаалахын тулд боломжит арга хэмжээг авдаг.
          </p>
        </Section>

        <Section title="5. Таны эрх">
          <ul className="list-disc pl-5 space-y-2">
            <li>Өөрийн мэдээлэлд хандах, засварлах</li>
            <li>Бүртгэл болон холбогдох мэдээллийг устгуулах хүсэлт гаргах</li>
            <li>Байршил, мэдэгдлийн зөвшөөрлийг төхөөрөмжийн тохиргооноос хүссэн үедээ цуцлах</li>
          </ul>
          <p>
            Бүртгэл устгуулах хүсэлтийг <strong className="text-foreground">{CONTACT_EMAIL}</strong>{' '}
            хаягаар илгээнэ үү.
          </p>
        </Section>

        <Section title="6. Хүүхдийн нууцлал">
          <p>
            Үйлчилгээ нь 18-аас доош насны хүүхдэд зориулагдаагүй бөгөөд бид хүүхдийн мэдээллийг
            зориудаар цуглуулдаггүй.
          </p>
        </Section>

        <Section title="7. Бодлогын өөрчлөлт">
          <p>
            Энэхүү бодлогыг шинэчилж болох бөгөөд өөрчлөлтийг энэ хуудсанд нийтэлнэ. Шинэчилсэн
            огноог дээд талд харуулна.
          </p>
        </Section>

        <Section title="8. Холбоо барих">
          <p>
            Нууцлалын талаар асуулт, хүсэлт байвал бидэнтэй холбогдоно уу:
            <br />
            И-мэйл: <strong className="text-foreground">{CONTACT_EMAIL}</strong>
            <br />
            Вэб: <strong className="text-foreground">https://shoptool.mn</strong>
          </p>
        </Section>
      </div>
    </div>
  );
}
