from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta

from database import get_db, Article

router = APIRouter()


class ArticleCreate(BaseModel):
    title_ja: str
    title_en: str
    content_ja: str
    content_en: str
    category: str
    tags: Optional[List[str]] = []
    author: str
    thumbnail_url: Optional[str] = None


def article_to_dict(a: Article) -> dict:
    return {
        "id": a.id,
        "title_ja": a.title_ja,
        "title_en": a.title_en,
        "content_ja": a.content_ja,
        "content_en": a.content_en,
        "category": a.category,
        "tags": a.tags.split(",") if a.tags else [],
        "author": a.author,
        "published_at": a.published_at,
        "thumbnail_url": a.thumbnail_url,
    }


@router.get("")
async def list_articles(
    category: Optional[str] = None,
    language: Optional[str] = None,
    keyword: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(Article).order_by(Article.published_at.desc())
    if category:
        query = query.where(Article.category == category)
    result = await db.execute(query)
    articles = result.scalars().all()
    dicts = [article_to_dict(a) for a in articles]

    if keyword:
        kw = keyword.lower()
        dicts = [
            a for a in dicts
            if kw in a["title_ja"].lower()
            or kw in a["title_en"].lower()
            or kw in a["content_ja"].lower()
            or kw in a["content_en"].lower()
        ]
    return dicts


@router.get("/{article_id}")
async def get_article(article_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Article).where(Article.id == article_id))
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return article_to_dict(article)


@router.post("")
async def create_article(req: ArticleCreate, db: AsyncSession = Depends(get_db)):
    article = Article(
        title_ja=req.title_ja,
        title_en=req.title_en,
        content_ja=req.content_ja,
        content_en=req.content_en,
        category=req.category,
        tags=",".join(req.tags or []),
        author=req.author,
        published_at=datetime.utcnow(),
        thumbnail_url=req.thumbnail_url,
    )
    db.add(article)
    await db.commit()
    await db.refresh(article)
    return article_to_dict(article)


async def seed_articles(db: AsyncSession):
    result = await db.execute(select(Article))
    existing = result.scalars().first()
    if existing:
        return

    now = datetime.utcnow()
    articles = [
        Article(
            title_ja="遠心圧縮機の効率改善技術：ポリトロープ効率向上のアプローチ",
            title_en="Efficiency Improvement in Centrifugal Compressors: Approaches to Enhancing Polytropic Efficiency",
            content_ja="""## 概要
遠心圧縮機のポリトロープ効率は、プラント全体のエネルギーコストに直結する重要な指標です。本稿では、最新の設計技術と運転最適化手法により効率を向上させるアプローチを解説します。

## インペラ設計の最適化
3次元CFD解析を活用した翼形状の最適化により、流体損失を低減します。後退翼（バックワードカーブド）インペラの採用により、ポリトロープ効率を1〜3%向上させることが可能です。

## 運転点の最適化
可変入口案内翼（IGV）の活用により、部分負荷時の効率低下を抑制します。設計点から±20%の流量範囲においても高効率を維持できます。

## ラビリンスシールのクリアランス管理
シールクリアランスの増大は内部リーク増加につながります。定期的な計測と管理により、効率低下を防ぎます。

## まとめ
適切な設計選択と維持管理により、遠心圧縮機のポリトロープ効率を長期にわたって高水準に維持することができます。""",
            content_en="""## Overview
Polytropic efficiency of centrifugal compressors is a critical metric directly tied to plant-wide energy costs. This article explains approaches to improve efficiency through the latest design technologies and operational optimization methods.

## Impeller Design Optimization
Minimizing fluid losses through impeller blade shape optimization using 3D CFD analysis. Adoption of backward-curved impellers can improve polytropic efficiency by 1-3%.

## Operating Point Optimization
Utilizing Variable Inlet Guide Vanes (IGV) to suppress efficiency degradation at partial loads. High efficiency can be maintained within ±20% of the design flow rate.

## Labyrinth Seal Clearance Management
Increased seal clearance leads to greater internal leakage. Regular measurement and management prevents efficiency degradation.

## Conclusion
Through appropriate design choices and maintenance, polytropic efficiency of centrifugal compressors can be maintained at a high level over the long term.""",
            category="技術情報",
            tags="効率,インペラ,CFD,IGV",
            author="技術開発部",
            published_at=now - timedelta(days=10),
            thumbnail_url=None,
        ),
        Article(
            title_ja="BWRSガス状態方程式を用いた圧縮機性能計算",
            title_en="Compressor Performance Calculation Using BWRS Equation of State",
            content_ja="""## はじめに
Benedict-Webb-Rubin-Starling（BWRS）状態方程式は、天然ガス系の圧縮機設計において最も信頼性の高い計算手法の一つです。

## BWRS方程式の特徴
BWRSはvan der Waals型の改良形であり、8つの組成依存定数を用いて広範な温度・圧力範囲でガスの挙動を精度良く表現します。特に高圧条件での計算精度に優れています。

## 実用的な適用例
- 圧力比と圧縮仕事の計算
- 圧縮機出口温度の推定
- 多成分ガス混合物の取扱い
- ポリトロープヘッドの計算

## 計算手順
1. ガス組成（モル分率）の確認
2. 混合則による疑似臨界定数の計算
3. BWRS式による圧縮係数Zの反復計算
4. ポリトロープ指数の決定
5. 性能パラメータの算出

## 精度の検証
実プラントデータとの比較により、BWRS計算は95%以上の精度で圧縮機性能を予測することが確認されています。""",
            content_en="""## Introduction
The Benedict-Webb-Rubin-Starling (BWRS) equation of state is one of the most reliable calculation methods for centrifugal compressor design in natural gas applications.

## Features of BWRS Equation
BWRS is an improved form of the van der Waals type, using eight composition-dependent constants to accurately represent gas behavior over a wide range of temperatures and pressures. It excels particularly in calculation accuracy at high-pressure conditions.

## Practical Applications
- Calculation of pressure ratio and compression work
- Estimation of compressor outlet temperature
- Handling of multi-component gas mixtures
- Calculation of polytropic head

## Calculation Procedure
1. Confirm gas composition (mole fractions)
2. Calculate pseudo-critical constants using mixing rules
3. Iterative calculation of compressibility factor Z using BWRS
4. Determination of polytropic exponent
5. Calculation of performance parameters

## Accuracy Verification
Comparison with actual plant data confirms that BWRS calculations predict compressor performance with over 95% accuracy.""",
            category="技術情報",
            tags="BWRS,状態方程式,性能計算,天然ガス",
            author="技術計算部",
            published_at=now - timedelta(days=25),
            thumbnail_url=None,
        ),
        Article(
            title_ja="2024年定期点検サービスキャンペーンのご案内",
            title_en="2024 Periodic Inspection Service Campaign Announcement",
            content_ja="""## キャンペーン概要
2024年度の定期点検サービスキャンペーンを実施いたします。この機会にぜひご活用ください。

## キャンペーン内容
- **基本点検パック**: 振動測定、温度測定、圧力測定、外観点検
  通常料金の20%オフ
- **フルオーバーホールパック**: 分解点検、全軸受交換、シール交換、クリアランス調整
  通常料金の15%オフ + 部品代10%オフ

## 対象期間
2024年4月1日〜2024年9月30日

## お申し込み方法
ポータルの「メンテナンス日程依頼」からお申し込みください。または担当営業までお問い合わせください。

## 特典
キャンペーン期間中にお申し込みいただいたお客様には、次回点検まで使用できるリモート監視サービス（3ヶ月無料）をプレゼントいたします。""",
            content_en="""## Campaign Overview
We are conducting our 2024 Annual Periodic Inspection Service Campaign. Please take advantage of this opportunity.

## Campaign Contents
- **Basic Inspection Package**: Vibration measurement, temperature measurement, pressure measurement, visual inspection
  20% off regular price
- **Full Overhaul Package**: Disassembly inspection, full bearing replacement, seal replacement, clearance adjustment
  15% off regular price + 10% off parts cost

## Target Period
April 1, 2024 - September 30, 2024

## How to Apply
Please apply through the "Maintenance Schedule Request" in the portal, or contact your sales representative.

## Special Benefits
Customers who apply during the campaign period will receive Remote Monitoring Service valid until the next inspection (3 months free).""",
            category="サービス情報",
            tags="キャンペーン,定期点検,オーバーホール",
            author="サービス営業部",
            published_at=now - timedelta(days=5),
            thumbnail_url=None,
        ),
        Article(
            title_ja="新型高効率インペラ「HI-Aero7」シリーズ発売",
            title_en="New High-Efficiency Impeller 'HI-Aero7' Series Released",
            content_ja="""## 製品概要
弊社の最新インペラシリーズ「HI-Aero7」をリリースいたします。最新の3D流体解析技術を採用し、従来比で最大5%の効率改善を実現しました。

## 主な特長
- **高効率翼形状**: 3D後退翼採用により失速マージンを向上
- **耐食コーティング**: TiNコーティングによる耐食性向上
- **ワイドレンジ対応**: 設計点±25%の広範囲で高効率を維持
- **軽量化**: 従来品比8%の重量削減

## 適用機種
CC-200シリーズ、CC-300シリーズの新設・改造工事に対応

## 価格・納期
詳細は弊社営業部にお問い合わせください。
標準納期：発注後16週間

## 技術仕様
- 最大効率: 89.5%（ポリトロープ）
- 最大入口体積流量: 15,000 m³/h
- 最大先端速度: 380 m/s""",
            content_en="""## Product Overview
We are releasing our latest impeller series "HI-Aero7." Utilizing the latest 3D fluid analysis technology, we have achieved up to 5% efficiency improvement compared to previous models.

## Key Features
- **High-Efficiency Blade Shape**: Improved stall margin with 3D backward-curved blades
- **Corrosion-Resistant Coating**: Enhanced corrosion resistance with TiN coating
- **Wide Range Operation**: Maintains high efficiency over ±25% of design point
- **Weight Reduction**: 8% weight reduction compared to previous models

## Compatible Models
Applicable for new installation and retrofit projects on CC-200 Series and CC-300 Series

## Price & Lead Time
Please contact our sales department for details.
Standard lead time: 16 weeks after order

## Technical Specifications
- Maximum efficiency: 89.5% (polytropic)
- Maximum inlet volumetric flow: 15,000 m³/h
- Maximum tip speed: 380 m/s""",
            category="製品情報",
            tags="インペラ,新製品,高効率,HI-Aero7",
            author="製品企画部",
            published_at=now - timedelta(days=3),
            thumbnail_url=None,
        ),
        Article(
            title_ja="LNG液化プラント向け圧縮機導入事例：東南アジアA社",
            title_en="Compressor Installation Case Study for LNG Liquefaction Plant: Southeast Asia Company A",
            content_ja="""## プロジェクト概要
東南アジアのLNG液化プラント向けに、弊社製遠心圧縮機を3台納入いたしました。本事例では、プロジェクトの概要と技術的な成果について報告します。

## 要求仕様
- ガス種：天然ガス（LNGボイルオフガス含む）
- 処理量：各機50万 Nm³/日
- 運転圧力：6.5 MPa（吐出）
- 環境：高温多湿、塩害環境

## 技術的課題と解決策
**課題1: 高含水分ガスへの対応**
特殊ラビリンスシールと耐食材料を採用し、水分の浸入を防止。

**課題2: 部分負荷運転の効率確保**
IGVと可変ディフューザ羽根（VDV）の組み合わせにより、30〜100%の広範囲で高効率を維持。

**課題3: 遠隔地での保守性**
リモート監視システムと予備品の現地ストックにより、ダウンタイムを最小化。

## 成果
- 保証性能を上回る運転効率（+2.3%）を達成
- 初年度の計画外停止ゼロを達成
- お客様より最高評価を獲得""",
            content_en="""## Project Overview
We delivered three centrifugal compressors to an LNG liquefaction plant in Southeast Asia. This case study reports on the project overview and technical achievements.

## Required Specifications
- Gas type: Natural gas (including LNG boil-off gas)
- Capacity: 500,000 Nm³/day per unit
- Operating pressure: 6.5 MPa (discharge)
- Environment: High temperature and humidity, salt damage environment

## Technical Challenges and Solutions
**Challenge 1: Handling High Moisture Content Gas**
Special labyrinth seals and corrosion-resistant materials were adopted to prevent moisture ingress.

**Challenge 2: Efficiency at Partial Load Operation**
Combining IGV with Variable Diffuser Vanes (VDV) maintains high efficiency over a wide range of 30-100%.

**Challenge 3: Maintainability in Remote Locations**
Remote monitoring system and on-site spare parts inventory minimized downtime.

## Results
- Achieved operating efficiency exceeding guaranteed performance (+2.3%)
- Zero unplanned shutdowns in the first year
- Received highest rating from customer""",
            category="事例紹介",
            tags="LNG,液化,東南アジア,IGV,事例",
            author="営業技術部",
            published_at=now - timedelta(days=45),
            thumbnail_url=None,
        ),
        Article(
            title_ja="軸受診断AIシステムによる予知保全の実現",
            title_en="Achieving Predictive Maintenance with Bearing Diagnostic AI System",
            content_ja="""## 背景
遠心圧縮機の計画外停止の主要原因の一つが軸受故障です。従来の時間基準保全から、状態基準保全（CBM）への移行が業界全体の課題となっています。

## AIシステムの概要
弊社のIoTセンサーと機械学習を組み合わせた軸受診断AIシステムは、振動データをリアルタイム解析し、異常の予兆を早期に検知します。

## 技術的特徴
- **振動スペクトル解析**: FFT解析による周波数成分の監視
- **機械学習モデル**: 正常データと異常データの学習による高精度判定
- **アラームシステム**: 3段階のアラーム（注意/警告/危険）
- **残寿命予測**: 現在の劣化速度から残り使用可能時間を推定

## 導入効果
某製油所での導入事例：
- 軸受交換コスト：35%削減
- 計画外停止：年4回→0回
- メンテナンスコスト全体：28%削減

## 今後の展開
2024年度より、本システムを標準サービスとして全ユーザー様に提供開始予定です。""",
            content_en="""## Background
Bearing failure is one of the main causes of unplanned shutdowns in centrifugal compressors. Transitioning from time-based maintenance to condition-based maintenance (CBM) is an industry-wide challenge.

## AI System Overview
Our bearing diagnostic AI system, combining IoT sensors with machine learning, performs real-time analysis of vibration data to detect early signs of anomalies.

## Technical Features
- **Vibration Spectrum Analysis**: Frequency component monitoring through FFT analysis
- **Machine Learning Model**: High-accuracy determination through learning from normal and abnormal data
- **Alarm System**: Three-level alarms (Caution/Warning/Danger)
- **Remaining Life Prediction**: Estimates remaining service time from current degradation rate

## Implementation Results
Case study from a petroleum refinery:
- Bearing replacement costs: 35% reduction
- Unplanned shutdowns: 4 times/year → 0 times
- Overall maintenance costs: 28% reduction

## Future Developments
From fiscal year 2024, this system is planned to be offered as a standard service to all users.""",
            category="技術情報",
            tags="AI,予知保全,軸受診断,IoT,CBM",
            author="デジタルソリューション部",
            published_at=now - timedelta(days=60),
            thumbnail_url=None,
        ),
    ]
    for a in articles:
        db.add(a)
    await db.commit()
    print("Articles seeded.")
