/**
 * 질문별 관련 컨텍스트 선택 서비스
 * AI 기반 질문 분석과 의미적 유사도를 통한 정확한 컨텍스트 선택
 */

import { GoogleGenAI } from '@google/genai';
import { Chunk, QuestionAnalysis } from '../types';

// 환경변수 로딩 (다양한 방법 시도)
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || 
                import.meta.env.GEMINI_API_KEY || 
                import.meta.env.API_KEY ||
                (typeof window !== 'undefined' && (window as any).process?.env?.VITE_GEMINI_API_KEY);

export class QuestionAnalyzer {
  private ai: GoogleGenAI | null = null;

  constructor() {
    console.log('QuestionAnalyzer 초기화 중...');
    console.log('API_KEY:', API_KEY ? '설정됨' : '설정되지 않음');
    console.log('API_KEY 길이:', API_KEY ? API_KEY.length : 0);
    
    if (API_KEY && API_KEY !== 'YOUR_GEMINI_API_KEY_HERE') {
      try {
        this.ai = new GoogleGenAI({ apiKey: API_KEY });
        console.log('GoogleGenAI 인스턴스 생성 성공');
        console.log('AI 객체 메서드들:', Object.getOwnPropertyNames(Object.getPrototypeOf(this.ai)));
      } catch (error) {
        console.error('GoogleGenAI 초기화 실패:', error);
        this.ai = null;
      }
    } else {
      console.warn('API_KEY가 설정되지 않았습니다.');
    }
  }

  /**
   * AI를 사용한 질문 분석
   */
  async analyzeQuestion(question: string): Promise<QuestionAnalysis> {
    if (!this.ai) {
      // AI가 없을 경우 기본 분석
      return this.basicAnalysis(question);
    }

    try {
      const analysisPrompt = `
다음 질문을 분석하여 JSON 형태로 답변해주세요:

질문: "${question}"

다음 형식으로 분석해주세요:
{
  "intent": "질문의 의도 (예: 금연구역 지정 절차 문의, 규정 내용 확인 등)",
  "keywords": ["핵심 키워드 배열"],
  "category": "질문 카테고리 (definition/procedure/regulation/comparison/analysis/general)",
  "complexity": "복잡도 (simple/medium/complex)",
  "entities": ["질문에서 언급된 구체적 개체들"],
  "context": "질문의 맥락 설명"
}

분석 기준:
- category: definition(정의), procedure(절차), regulation(규정), comparison(비교), analysis(분석), general(일반)
- complexity: simple(단순), medium(중간), complex(복잡)
- keywords: 질문의 핵심을 나타내는 중요한 단어들
- entities: 구체적인 명사, 기관명, 법령명 등
`;

      // GoogleGenAI API 사용법 확인 및 수정 (GeminiService와 동일한 방식)
      let response;
      try {
        // GeminiService와 동일한 방식으로 채팅 세션 생성
        const chat = this.ai.chats.create({
          model: 'gemini-2.5-flash',
          config: {
            systemInstruction: 'You are a helpful assistant that analyzes questions and returns JSON responses.',
          },
          history: [],
        });

        // GeminiService와 동일한 방식으로 메시지 전송
        const stream = await chat.sendMessageStream({ message: analysisPrompt });
        
        let fullResponse = '';
        for await (const chunk of stream) {
          if (chunk.text) {
            fullResponse += chunk.text;
          }
        }
        
        response = { response: { text: () => fullResponse } };
        console.log('AI 질문 분석 성공 (GeminiService 방식)');
      } catch (apiError) {
        console.error('AI API 호출 실패:', apiError);
        throw apiError;
      }

      // 응답 텍스트 추출 (GeminiService와 동일한 방식)
      let analysisText;
      if (response && response.response) {
        analysisText = response.response.text();
      } else if (response && typeof response.text === 'function') {
        analysisText = response.text();
      } else if (response && response.text) {
        analysisText = response.text;
      } else if (typeof response === 'string') {
        analysisText = response;
      } else {
        analysisText = String(response);
      }
      const analysis = this.parseAnalysisResponse(analysisText);
      
      return analysis;
    } catch (error) {
      console.warn('AI 질문 분석 실패, 기본 분석 사용:', error);
      return this.basicAnalysis(question);
    }
  }

  /**
   * 기본 질문 분석 (AI 없이)
   */
  private basicAnalysis(question: string): QuestionAnalysis {
    const keywords = this.extractKeywords(question);
    const category = this.classifyCategory(question);
    const complexity = this.assessComplexity(question);
    const entities = this.extractEntities(question);

    return {
      intent: this.generateIntent(question, keywords),
      keywords,
      category,
      complexity,
      entities,
      context: question
    };
  }

  /**
   * AI 응답 파싱
   */
  private parseAnalysisResponse(responseText: string): QuestionAnalysis {
    try {
      // JSON 부분만 추출
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        return {
          intent: analysis.intent || '',
          keywords: analysis.keywords || [],
          category: analysis.category || 'general',
          complexity: analysis.complexity || 'medium',
          entities: analysis.entities || [],
          context: analysis.context || ''
        };
      }
    } catch (error) {
      console.warn('AI 응답 파싱 실패:', error);
    }

    // 파싱 실패시 기본 분석
    return this.basicAnalysis('');
  }

  /**
   * 키워드 추출
   */
  private extractKeywords(question: string): string[] {
    const keywords = [
      '금연', '금연구역', '건강증진', '시행령', '시행규칙', '지정', '관리', '업무', '지침',
      '서비스', '통합', '사업', '지원', '규정', '법률', '조항', '항목', '절차', '방법',
      '기준', '요건', '조건', '제한', '신고', '신청', '처리', '심사', '승인', '허가',
      '등록', '변경', '취소', '정지', '폐지', '해제', '위반', '과태료', '벌금', '처벌',
      '제재', '조치', '시설', '장소', '구역', '지역', '범위', '대상', '기관', '단체',
      '조직', '협회', '연합', '연합회', '담당', '책임', '의무', '권한', '기능', '역할'
    ];

    return keywords.filter(keyword => 
      question.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  /**
   * 질문 카테고리 분류
   */
  private classifyCategory(question: string): QuestionAnalysis['category'] {
    const q = question.toLowerCase();

    if (q.includes('무엇') || q.includes('정의') || q.includes('의미') || q.includes('개념')) {
      return 'definition';
    }
    if (q.includes('절차') || q.includes('방법') || q.includes('과정') || q.includes('단계')) {
      return 'procedure';
    }
    if (q.includes('규정') || q.includes('법령') || q.includes('조항') || q.includes('규칙')) {
      return 'regulation';
    }
    if (q.includes('비교') || q.includes('차이') || q.includes('구분') || q.includes('vs')) {
      return 'comparison';
    }
    if (q.includes('분석') || q.includes('검토') || q.includes('평가') || q.includes('고려')) {
      return 'analysis';
    }

    return 'general';
  }

  /**
   * 복잡도 평가
   */
  private assessComplexity(question: string): QuestionAnalysis['complexity'] {
    const q = question.toLowerCase();
    
    if (q.length < 20 && !q.includes('?') && !q.includes('어떻게')) {
      return 'simple';
    }
    if (q.length > 50 || q.includes('여러') || q.includes('복합') || q.includes('종합')) {
      return 'complex';
    }
    
    return 'medium';
  }

  /**
   * 개체 추출
   */
  private extractEntities(question: string): string[] {
    const entities: string[] = [];
    
    // 법령명 패턴
    const lawPatterns = [
      /국민건강증진법률/gi,
      /시행령/gi,
      /시행규칙/gi,
      /질서위반행위규제법/gi
    ];
    
    lawPatterns.forEach(pattern => {
      const matches = question.match(pattern);
      if (matches) {
        entities.push(...matches);
      }
    });

    // 기관명 패턴
    const orgPatterns = [
      /보건복지부/gi,
      /시도/gi,
      /시군구/gi,
      /지역사회/gi
    ];
    
    orgPatterns.forEach(pattern => {
      const matches = question.match(pattern);
      if (matches) {
        entities.push(...matches);
      }
    });

    return [...new Set(entities)];
  }

  /**
   * 의도 생성
   */
  private generateIntent(question: string, keywords: string[]): string {
    if (keywords.length === 0) {
      return '일반적인 문의';
    }

    const mainKeyword = keywords[0];
    const category = this.classifyCategory(question);
    
    switch (category) {
      case 'definition':
        return `${mainKeyword}에 대한 정의나 개념 문의`;
      case 'procedure':
        return `${mainKeyword} 관련 절차나 방법 문의`;
      case 'regulation':
        return `${mainKeyword} 관련 규정이나 법령 문의`;
      case 'comparison':
        return `${mainKeyword} 관련 비교나 차이점 문의`;
      case 'analysis':
        return `${mainKeyword} 관련 분석이나 검토 문의`;
      default:
        return `${mainKeyword} 관련 일반 문의`;
    }
  }
}

export class ContextSelector {
  private allChunks: Chunk[] = [];
  private readonly TARGET_TOKENS = 100000; // 10만 토큰으로 증가
  
  // 한국어 동의어 사전
  private readonly KOREAN_SYNONYMS: Record<string, string[]> = {
    '금연': ['금연사업', '담배금지', '흡연금지', '금연정책', '금연운동', '금연지원'],
    '지정': ['선정', '고시', '공시', '발표', '선정', '지정고시'],
    '관리': ['운영', '관할', '담당', '처리', '관리운영', '관리업무'],
    '절차': ['방법', '과정', '순서', '단계', '절차방법', '처리절차'],
    '신청': ['접수', '제출', '등록', '신고', '신청접수', '제출신청'],
    '심사': ['검토', '심의', '평가', '심사검토', '심의평가'],
    '승인': ['허가', '인가', '승인허가', '인가승인'],
    '규정': ['법령', '규칙', '지침', '규정사항', '법규'],
    '지침': ['가이드', '매뉴얼', '지침서', '운영지침'],
    '서비스': ['지원', '제공', '서비스지원', '지원서비스'],
    '건강증진': ['건강향상', '건강증진사업', '건강관리'],
    '시설': ['장소', '시설물', '건물', '공간'],
    '위반': ['위반행위', '위반사항', '위반처리'],
    '과태료': ['벌금', '과금', '처벌', '제재'],
    '보고': ['제출', '보고서', '보고사항', '보고제출'],
    '교육': ['훈련', '교육프로그램', '교육과정', '연수'],
    '홍보': ['선전', '홍보활동', '홍보사업', '홍보물'],
    '점검': ['검사', '점검사항', '점검업무', '모니터링'],
    '통계': ['통계자료', '통계분석', '통계수집', '데이터'],
    '분석': ['검토', '분석자료', '분석결과', '연구'],
    '개선': ['향상', '개선사항', '개선방안', '개선계획'],
    '지원': ['도움', '지원사업', '지원활동', '지원정책'],
    '협력': ['협조', '협력사업', '협력활동', '연계'],
    '평가': ['검증', '평가사항', '평가결과', '성과평가'],
    '운영': ['관리', '운영방법', '운영계획', '운영지침'],
    '개발': ['구축', '개발사업', '개발계획', '시스템개발'],
    '보안': ['안전', '보안관리', '보안사항', '정보보안'],
    '업데이트': ['갱신', '수정', '변경', '개선'],
    '장애': ['문제', '오류', '장애처리', '문제해결'],
    '대응': ['처리', '대응방안', '대응절차', '대응계획']
  };

  /**
   * 청크 설정
   */
  setChunks(chunks: Chunk[]): void {
    this.allChunks = chunks;
  }

  /**
   * 질문에 대한 관련 컨텍스트 선택 (다단계 검색 시스템)
   */
  async selectRelevantContext(
    question: string, 
    analysis: QuestionAnalysis
  ): Promise<Chunk[]> {
    if (this.allChunks.length === 0) {
      return [];
    }

    console.log('🔍 다단계 검색 시스템 시작...');

    // 1단계: 정확한 키워드 매칭
    console.log('1단계: 정확한 키워드 매칭');
    const exactMatches = this.findExactMatches(question, analysis);
    console.log(`정확한 매칭: ${exactMatches.length}개 청크`);

    // 2단계: 동의어/유사어 검색
    console.log('2단계: 동의어/유사어 검색');
    const synonymMatches = this.findSynonymMatches(question, analysis);
    console.log(`동의어 매칭: ${synonymMatches.length}개 청크`);

    // 3단계: 의미적 유사성 검색
    console.log('3단계: 의미적 유사성 검색');
    const semanticMatches = this.findSemanticMatches(question, analysis);
    console.log(`의미적 매칭: ${semanticMatches.length}개 청크`);

    // 4단계: 관련 청크 확장
    console.log('4단계: 관련 청크 확장');
    const expandedMatches = this.expandRelatedChunks(exactMatches);
    console.log(`확장된 매칭: ${expandedMatches.length}개 청크`);

    // 5단계: 질문 유형별 맞춤 검색
    console.log('5단계: 질문 유형별 맞춤 검색');
    const typeSpecificMatches = this.getSearchStrategy(analysis);
    console.log(`유형별 매칭: ${typeSpecificMatches.length}개 청크`);

    // 6단계: 최종 통합 및 정렬
    console.log('6단계: 최종 통합 및 정렬');
    const allMatches = this.mergeAndRankChunks([
      exactMatches, 
      synonymMatches, 
      semanticMatches, 
      expandedMatches,
      typeSpecificMatches
    ]);

    // 7단계: 품질 검증
    console.log('7단계: 품질 검증');
    const validatedChunks = this.validateSearchResults(allMatches, question);
    console.log(`검증된 청크: ${validatedChunks.length}개`);

    // 8단계: 토큰 제한 내에서 최종 선택
    const finalChunks = this.selectFinalChunks(validatedChunks, analysis);
    console.log(`최종 선택된 청크: ${finalChunks.length}개, 예상 토큰: ${this.calculateTotalTokens(finalChunks).toLocaleString()}개`);
    
    return finalChunks;
  }

  /**
   * 청크와 질문 분석의 관련도 점수 계산
   */
  private calculateRelevanceScore(chunk: Chunk, analysis: QuestionAnalysis): number {
    let score = 0;

    // 1. 키워드 매칭 점수 (가장 중요)
    const keywordMatches = analysis.keywords.filter(keyword =>
      chunk.content.toLowerCase().includes(keyword.toLowerCase())
    ).length;
    score += keywordMatches * 10;

    // 2. 개체 매칭 점수
    const entityMatches = analysis.entities.filter(entity =>
      chunk.content.toLowerCase().includes(entity.toLowerCase())
    ).length;
    score += entityMatches * 15;

    // 3. 카테고리별 가중치
    const categoryWeight = this.getCategoryWeight(analysis.category);
    score *= categoryWeight;

    // 4. 청크 품질 점수
    const qualityScore = this.calculateChunkQuality(chunk);
    score += qualityScore;

    // 5. 위치 가중치 (문서 앞부분이 더 중요할 수 있음)
    const positionWeight = this.calculatePositionWeight(chunk);
    score *= positionWeight;

    return Math.max(0, score);
  }

  /**
   * 카테고리별 가중치
   */
  private getCategoryWeight(category: QuestionAnalysis['category']): number {
    switch (category) {
      case 'definition': return 1.2;
      case 'procedure': return 1.1;
      case 'regulation': return 1.3;
      case 'comparison': return 1.0;
      case 'analysis': return 1.1;
      default: return 1.0;
    }
  }

  /**
   * 청크 품질 점수 계산
   */
  private calculateChunkQuality(chunk: Chunk): number {
    let quality = 0;

    // 길이 점수 (적절한 길이의 청크에 높은 점수)
    if (chunk.content.length > 500 && chunk.content.length < 3000) {
      quality += 5;
    } else if (chunk.content.length > 200 && chunk.content.length < 5000) {
      quality += 3;
    }

    // 구조적 요소 점수
    if (chunk.content.includes('제') && chunk.content.includes('조')) {
      quality += 3; // 법조문
    }
    if (chunk.content.includes('규정') || chunk.content.includes('지침')) {
      quality += 2; // 규정 관련
    }

    // 문장 완성도
    const sentenceCount = (chunk.content.match(/[.!?]/g) || []).length;
    if (sentenceCount > 0) {
      quality += Math.min(2, sentenceCount);
    }

    return quality;
  }

  /**
   * 위치 가중치 계산
   */
  private calculatePositionWeight(chunk: Chunk): number {
    // 문서의 앞부분일수록 높은 가중치
    const position = chunk.metadata.chunkIndex / this.allChunks.length;
    return 1.2 - (position * 0.4); // 1.2에서 0.8까지 감소
  }

  /**
   * 토큰 수 추정
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  // ==================== 다단계 검색 시스템 메서드들 ====================

  /**
   * 1단계: 정확한 키워드 매칭
   */
  private findExactMatches(question: string, analysis: QuestionAnalysis): Chunk[] {
    const candidateChunks = this.allChunks.slice(0, Math.min(200, this.allChunks.length));
    
    return candidateChunks.filter(chunk => {
      const score = this.calculateRelevanceScore(chunk, analysis);
      return score > 0.1; // 높은 임계값으로 정확한 매칭만
    }).sort((a, b) => 
      this.calculateRelevanceScore(b, analysis) - this.calculateRelevanceScore(a, analysis)
    ).slice(0, 20); // 상위 20개만
  }

  /**
   * 2단계: 동의어/유사어 검색
   */
  private findSynonymMatches(question: string, analysis: QuestionAnalysis): Chunk[] {
    const synonyms = this.extractSynonyms(question);
    const expandedKeywords = [...analysis.keywords, ...synonyms];
    
    const expandedAnalysis: QuestionAnalysis = {
      ...analysis,
      keywords: expandedKeywords
    };

    const candidateChunks = this.allChunks.slice(0, Math.min(300, this.allChunks.length));
    
    return candidateChunks.filter(chunk => {
      const score = this.calculateRelevanceScore(chunk, expandedAnalysis);
      return score > 0.05; // 중간 임계값
    }).sort((a, b) => 
      this.calculateRelevanceScore(b, expandedAnalysis) - this.calculateRelevanceScore(a, expandedAnalysis)
    ).slice(0, 30); // 상위 30개
  }

  /**
   * 3단계: 의미적 유사성 검색
   */
  private findSemanticMatches(question: string, analysis: QuestionAnalysis): Chunk[] {
    const questionVector = this.vectorizeText(question);
    const candidateChunks = this.allChunks.slice(0, Math.min(400, this.allChunks.length));
    
    return candidateChunks.filter(chunk => {
      const chunkVector = this.vectorizeText(chunk.content);
      const similarity = this.calculateCosineSimilarity(questionVector, chunkVector);
      return similarity > 0.3; // 의미적 유사성 임계값
    }).sort((a, b) => {
      const aSim = this.calculateCosineSimilarity(questionVector, this.vectorizeText(a.content));
      const bSim = this.calculateCosineSimilarity(questionVector, this.vectorizeText(b.content));
      return bSim - aSim;
    }).slice(0, 25); // 상위 25개
  }

  /**
   * 4단계: 관련 청크 확장
   */
  private expandRelatedChunks(initialChunks: Chunk[]): Chunk[] {
    const expandedChunks = new Set<Chunk>(initialChunks);
    
    initialChunks.forEach(chunk => {
      // 인접한 청크들 추가
      const adjacentChunks = this.getAdjacentChunks(chunk);
      adjacentChunks.forEach(adj => expandedChunks.add(adj));
      
      // 같은 섹션의 다른 청크들 추가
      const sectionChunks = this.getChunksInSameSection(chunk);
      sectionChunks.forEach(sec => expandedChunks.add(sec));
    });
    
    return Array.from(expandedChunks);
  }

  /**
   * 5단계: 질문 유형별 맞춤 검색
   */
  private getSearchStrategy(analysis: QuestionAnalysis): Chunk[] {
    switch (analysis.category) {
      case 'definition':
        return this.searchForDefinitions(analysis);
      case 'procedure':
        return this.searchForProcedures(analysis);
      case 'regulation':
        return this.searchForRegulations(analysis);
      case 'comparison':
        return this.searchForComparisons(analysis);
      case 'analysis':
        return this.searchForAnalysis(analysis);
      default:
        return this.searchGeneral(analysis);
    }
  }

  /**
   * 6단계: 최종 통합 및 정렬
   */
  private mergeAndRankChunks(chunkArrays: Chunk[][]): Chunk[] {
    const chunkMap = new Map<string, Chunk & { totalScore: number; sourceCount: number }>();
    
    chunkArrays.forEach((chunks, sourceIndex) => {
      chunks.forEach(chunk => {
        const key = chunk.id;
        if (chunkMap.has(key)) {
          const existing = chunkMap.get(key)!;
          existing.totalScore += (chunk as any).relevanceScore || 0;
          existing.sourceCount += 1;
        } else {
          chunkMap.set(key, {
            ...chunk,
            totalScore: (chunk as any).relevanceScore || 0,
            sourceCount: 1
          });
        }
      });
    });
    
    return Array.from(chunkMap.values())
      .sort((a, b) => {
        // 소스 수와 점수를 모두 고려
        const aScore = a.totalScore * (1 + a.sourceCount * 0.1);
        const bScore = b.totalScore * (1 + b.sourceCount * 0.1);
        return bScore - aScore;
      })
      .slice(0, 100); // 상위 100개
  }

  /**
   * 7단계: 품질 검증
   */
  private validateSearchResults(chunks: Chunk[], question: string): Chunk[] {
    return chunks.filter(chunk => {
      // 1. 최소 관련성 점수 확인
      const relevanceScore = this.calculateBasicRelevanceScore(chunk, question);
      if (relevanceScore < 0.05) return false;
      
      // 2. 내용 완성도 확인
      const completeness = this.checkContentCompleteness(chunk);
      if (completeness < 0.3) return false;
      
      // 3. 중복성 제거
      return !this.isDuplicateContent(chunk, chunks);
    });
  }

  /**
   * 8단계: 토큰 제한 내에서 최종 선택
   */
  private selectFinalChunks(chunks: Chunk[], analysis: QuestionAnalysis): Chunk[] {
    const selectedChunks: Chunk[] = [];
    let totalTokens = 0;

    for (const chunk of chunks) {
      const chunkTokens = this.estimateTokens(chunk.content);
      
      if (totalTokens + chunkTokens <= this.TARGET_TOKENS) {
        selectedChunks.push({
          ...chunk,
          relevanceScore: this.calculateRelevanceScore(chunk, analysis)
        });
        totalTokens += chunkTokens;
      } else {
        // 토큰 제한에 도달했지만, 높은 점수의 청크는 추가
        if (chunkTokens <= this.TARGET_TOKENS * 0.1) { // 10% 이내면 추가
          selectedChunks.push({
            ...chunk,
            relevanceScore: this.calculateRelevanceScore(chunk, analysis)
          });
          totalTokens += chunkTokens;
        }
        break;
      }
    }

    return selectedChunks;
  }

  // ==================== 보조 메서드들 ====================

  /**
   * 동의어 추출
   */
  private extractSynonyms(text: string): string[] {
    const synonyms: string[] = [];
    const words = text.split(/\s+/);
    
    words.forEach(word => {
      const cleanWord = word.replace(/[^\w가-힣]/g, '');
      if (this.KOREAN_SYNONYMS[cleanWord]) {
        synonyms.push(...this.KOREAN_SYNONYMS[cleanWord]);
      }
    });
    
    return [...new Set(synonyms)]; // 중복 제거
  }

  /**
   * 텍스트 벡터화 (간단한 버전)
   */
  private vectorizeText(text: string): number[] {
    const words = text.toLowerCase().split(/\s+/);
    const wordCount: Record<string, number> = {};
    
    words.forEach(word => {
      const cleanWord = word.replace(/[^\w가-힣]/g, '');
      if (cleanWord.length > 1) {
        wordCount[cleanWord] = (wordCount[cleanWord] || 0) + 1;
      }
    });
    
    // 간단한 TF 벡터 생성
    const allWords = Object.keys(wordCount);
    const vector = new Array(100).fill(0); // 100차원 벡터
    
    allWords.forEach((word, index) => {
      if (index < 100) {
        vector[index] = wordCount[word];
      }
    });
    
    return vector;
  }

  /**
   * 코사인 유사도 계산
   */
  private calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * 인접한 청크 찾기
   */
  private getAdjacentChunks(chunk: Chunk): Chunk[] {
    const index = chunk.metadata.chunkIndex;
    const adjacent: Chunk[] = [];
    
    // 이전 청크
    if (index > 0) {
      const prevChunk = this.allChunks.find(c => c.metadata.chunkIndex === index - 1);
      if (prevChunk) adjacent.push(prevChunk);
    }
    
    // 다음 청크
    const nextChunk = this.allChunks.find(c => c.metadata.chunkIndex === index + 1);
    if (nextChunk) adjacent.push(nextChunk);
    
    return adjacent;
  }

  /**
   * 같은 섹션의 청크들 찾기
   */
  private getChunksInSameSection(chunk: Chunk): Chunk[] {
    const section = chunk.location.section;
    if (!section) return [];
    
    return this.allChunks.filter(c => 
      c.location.section === section && c.id !== chunk.id
    ).slice(0, 5); // 최대 5개
  }

  /**
   * 질문 유형별 검색 전략들
   */
  private searchForDefinitions(analysis: QuestionAnalysis): Chunk[] {
    return this.allChunks.filter(chunk => 
      chunk.content.includes('정의') || 
      chunk.content.includes('의미') ||
      chunk.content.includes('뜻은') ||
      chunk.content.includes('이란')
    ).slice(0, 15);
  }

  private searchForProcedures(analysis: QuestionAnalysis): Chunk[] {
    return this.allChunks.filter(chunk => 
      chunk.content.includes('절차') || 
      chunk.content.includes('방법') ||
      chunk.content.includes('과정') ||
      chunk.content.includes('단계')
    ).slice(0, 15);
  }

  private searchForRegulations(analysis: QuestionAnalysis): Chunk[] {
    return this.allChunks.filter(chunk => 
      chunk.content.includes('규정') || 
      chunk.content.includes('법령') ||
      chunk.content.includes('지침') ||
      chunk.content.includes('제') && chunk.content.includes('조')
    ).slice(0, 20);
  }

  private searchForComparisons(analysis: QuestionAnalysis): Chunk[] {
    return this.allChunks.filter(chunk => 
      chunk.content.includes('비교') || 
      chunk.content.includes('차이') ||
      chunk.content.includes('구분') ||
      chunk.content.includes('대비')
    ).slice(0, 10);
  }

  private searchForAnalysis(analysis: QuestionAnalysis): Chunk[] {
    return this.allChunks.filter(chunk => 
      chunk.content.includes('분석') || 
      chunk.content.includes('검토') ||
      chunk.content.includes('평가') ||
      chunk.content.includes('통계')
    ).slice(0, 15);
  }

  private searchGeneral(analysis: QuestionAnalysis): Chunk[] {
    return this.allChunks.slice(0, 50); // 일반적인 경우 상위 50개
  }

  /**
   * 기본 관련성 점수 계산
   */
  private calculateBasicRelevanceScore(chunk: Chunk, question: string): number {
    const questionWords = question.toLowerCase().split(/\s+/);
    let score = 0;
    
    questionWords.forEach(word => {
      if (chunk.content.toLowerCase().includes(word)) {
        score += 1;
      }
    });
    
    return score / questionWords.length;
  }

  /**
   * 내용 완성도 확인
   */
  private checkContentCompleteness(chunk: Chunk): number {
    let completeness = 0;
    
    // 길이 점수
    if (chunk.content.length > 100) completeness += 0.3;
    if (chunk.content.length > 500) completeness += 0.3;
    
    // 문장 완성도
    const sentenceCount = (chunk.content.match(/[.!?]/g) || []).length;
    if (sentenceCount > 0) completeness += 0.2;
    if (sentenceCount > 2) completeness += 0.2;
    
    return Math.min(1, completeness);
  }

  /**
   * 중복 내용 확인
   */
  private isDuplicateContent(chunk: Chunk, chunks: Chunk[]): boolean {
    const content = chunk.content.toLowerCase();
    return chunks.some(other => 
      other.id !== chunk.id && 
      other.content.toLowerCase().includes(content.substring(0, 50))
    );
  }

  /**
   * 총 토큰 수 계산
   */
  private calculateTotalTokens(chunks: Chunk[]): number {
    return chunks.reduce((total, chunk) => total + this.estimateTokens(chunk.content), 0);
  }
}

// 싱글톤 인스턴스들
export const questionAnalyzer = new QuestionAnalyzer();
export const contextSelector = new ContextSelector();
