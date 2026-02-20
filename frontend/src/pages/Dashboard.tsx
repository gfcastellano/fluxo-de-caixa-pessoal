import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useVoice } from '../context/VoiceContext';
import { useUserSetup } from '../hooks/useUserSetup';
import { useDashboardData } from '../hooks/useDashboardData';
import { Card, CardContent } from '../components/Card';
import { Button } from '../components/Button';
import { formatCurrency, formatMonthYear, getCurrentMonth } from '../utils/format';
import { getTranslatedCategoryName } from '../utils/categoryTranslations';
import { CashCurrencyIcon } from '../components/CashCurrencyIcon';
import {
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Wallet,
  CreditCard as CreditCardIcon,
  Landmark,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useFamily } from '../context/FamilyContext';
import { SharedDataBadge } from '../components/SharedDataBadge';
import { cn } from '../utils/cn';

export function Dashboard() {
  useUserSetup();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { shouldOpenModal, clearModalRequest } = useVoice();
  const { viewMode, getMemberPhoto } = useFamily();

  const {
    homeSummary,
    accountCurrencyMap,
    loading,
  } = useDashboardData();

  const [monthExpanded, setMonthExpanded] = useState(false);
  const [yearExpanded, setYearExpanded] = useState(false);

  // When Hero button is clicked on Dashboard, navigate to /transactions to add
  useEffect(() => {
    if (shouldOpenModal) {
      clearModalRequest();
      navigate('/transactions?action=add');
    }
  }, [shouldOpenModal, clearModalRequest, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue"></div>
      </div>
    );
  }

  const { year, month } = getCurrentMonth();
  const monthLabel = formatMonthYear(year, month);

  return (
    <div className="flex flex-col sm:gap-6 gap-4 sm:p-6 p-4 overflow-x-hidden">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-ink capitalize">{monthLabel}</h1>
          {viewMode === 'family' && (
            <span className="text-xs text-violet-600 font-medium flex items-center gap-1 mt-0.5">
              <Users size={12} /> Visão família
            </span>
          )}
        </div>
        <Link to="/reports">
          <Button variant="ghost" size="sm" className="text-slate text-xs">
            {t('dashboard.viewAll')}
            <ChevronRight size={14} className="ml-0.5" />
          </Button>
        </Link>
      </div>

      {/* ── Este mês: 3 números ── */}
      <Card className="bg-white/50 backdrop-blur-xl border-white/60">
        <CardContent className="py-4 lg:py-6 px-4 sm:px-6">
          <div className="grid grid-cols-3 gap-3 lg:gap-6 text-center">
            {/* Income */}
            <div>
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp size={14} className="text-emerald" />
                <span className="text-[11px] lg:text-sm text-slate font-medium">Receita</span>
              </div>
              {Object.keys(homeSummary.byCurrency).length === 0 ? (
                <p className="text-sm sm:text-base lg:text-xl font-bold text-emerald tabular-nums">{formatCurrency(0)}</p>
              ) : (
                Object.entries(homeSummary.byCurrency).map(([cur, s]) => (
                  <p key={cur} className="text-sm sm:text-base lg:text-xl font-bold text-emerald tabular-nums">{formatCurrency(s.income, cur)}</p>
                ))
              )}
            </div>

            {/* Expense */}
            <div>
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingDown size={14} className="text-rose" />
                <span className="text-[11px] lg:text-sm text-slate font-medium">Despesa</span>
              </div>
              {Object.keys(homeSummary.byCurrency).length === 0 ? (
                <p className="text-sm sm:text-base lg:text-xl font-bold text-rose tabular-nums">{formatCurrency(0)}</p>
              ) : (
                Object.entries(homeSummary.byCurrency).map(([cur, s]) => (
                  <p key={cur} className="text-sm sm:text-base lg:text-xl font-bold text-rose tabular-nums">{formatCurrency(s.expense, cur)}</p>
                ))
              )}
            </div>

            {/* Net */}
            <div>
              <div className="flex items-center justify-center gap-1 mb-1">
                <Wallet size={14} className={homeSummary.monthNet >= 0 ? 'text-emerald' : 'text-rose'} />
                <span className="text-[11px] lg:text-sm text-slate font-medium">Resultado</span>
              </div>
              {Object.keys(homeSummary.byCurrency).length === 0 ? (
                <p className="text-sm sm:text-base lg:text-xl font-bold text-emerald tabular-nums">{formatCurrency(0)}</p>
              ) : (
                Object.entries(homeSummary.byCurrency).map(([cur, s]) => (
                  <p key={cur} className={`text-sm sm:text-base lg:text-xl font-bold tabular-nums ${s.net >= 0 ? 'text-emerald' : 'text-rose'}`}>
                    {formatCurrency(s.net, cur)}
                  </p>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Projeções ── */}
      {(homeSummary.monthProjectionNet || homeSummary.yearEndProjection) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
          {/* Monthly projection */}
          {homeSummary.monthProjectionNet && (
            <Card className="bg-gradient-to-r from-blue-50/60 to-indigo-50/60 backdrop-blur-xl border-blue-100/50">
              <CardContent className="py-3 lg:py-4 px-4 sm:px-6">
                <p className="text-[11px] lg:text-xs text-blue-600/70 font-medium mb-1">Mantendo este ritmo, você terminará o mês com</p>
                <p className={`text-lg lg:text-2xl font-bold tabular-nums ${homeSummary.monthProjectionNet.value >= 0 ? 'text-blue-700' : 'text-rose'}`}>
                  {formatCurrency(homeSummary.monthProjectionNet.value)}
                </p>
                <p className="text-[10px] lg:text-[11px] text-slate/60 mt-1">{homeSummary.monthProjectionNet.explanation}</p>

                {homeSummary.monthProjectionInputs && homeSummary.monthProjectionInputs.remainingDays > 0 && (
                  <>
                    <button
                      onClick={() => setMonthExpanded(prev => !prev)}
                      className="flex items-center gap-1 mt-2 text-[10px] lg:text-[11px] text-blue-500/70 hover:text-blue-600 transition-colors"
                    >
                      <span>Ver por quê</span>
                      {monthExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>

                    <div className={cn(
                      'overflow-hidden transition-all duration-300 ease-in-out',
                      monthExpanded ? 'max-h-[32rem] opacity-100 mt-3' : 'max-h-0 opacity-0 mt-0'
                    )}>
                      <div className="border-t border-blue-100/50 pt-3 space-y-3">
                        {/* Section 1: O que já aconteceu */}
                        <div>
                          <div className="flex justify-between text-[11px] lg:text-xs">
                            <span className="text-slate/70 font-medium">O que já aconteceu</span>
                            <span className="font-medium text-ink tabular-nums">
                              {formatCurrency(homeSummary.monthProjectionInputs.pastNet)}
                            </span>
                          </div>
                          <div className="ml-3 mt-1 space-y-0.5">
                            <div className="flex justify-between text-[10px] lg:text-[11px]">
                              <span className="text-emerald/70">Receita realizada</span>
                              <span className="text-emerald tabular-nums">+{formatCurrency(homeSummary.monthProjectionInputs.pastIncome)}</span>
                            </div>
                            <div className="flex justify-between text-[10px] lg:text-[11px]">
                              <span className="text-rose/70">Despesa realizada</span>
                              <span className="text-rose tabular-nums">-{formatCurrency(homeSummary.monthProjectionInputs.pastExpense)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Section 2: Previsto */}
                        <div>
                          <div className="flex justify-between text-[11px] lg:text-xs">
                            <span className="text-slate/70 font-medium">
                              Previsto p/ restante do mês
                            </span>
                            <span className="font-medium text-ink tabular-nums">
                              {formatCurrency(homeSummary.monthProjectionInputs.futureScheduledNet)}
                            </span>
                          </div>
                          {homeSummary.monthProjectionInputs.futureTransactions.length > 0 && (
                            <div className="ml-3 mt-1 space-y-0.5">
                              {homeSummary.monthProjectionInputs.futureTransactions.map((ft, i) => (
                                <div key={i} className="flex justify-between text-[10px] lg:text-[11px]">
                                  <span className="text-slate/60 truncate mr-2">
                                    {new Date(ft.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} — {ft.description}
                                  </span>
                                  <span className={cn('tabular-nums flex-shrink-0', ft.type === 'income' ? 'text-emerald' : 'text-rose')}>
                                    {ft.type === 'income' ? '+' : '-'}{formatCurrency(ft.amount)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Section 3: Tendência variável */}
                        <div className="flex justify-between text-[11px] lg:text-xs">
                          <span className="text-slate/70 font-medium">
                            Tendência variável ({homeSummary.monthProjectionInputs.windowDays} dias)
                          </span>
                          <span className="font-medium text-ink tabular-nums">
                            {formatCurrency(homeSummary.monthProjectionInputs.discretionaryDailyAvg)}/dia &times; {homeSummary.monthProjectionInputs.remainingDays} dias
                          </span>
                        </div>

                        {/* Formula */}
                        <div className="border-t border-blue-100/30 pt-2 text-[10px] lg:text-[11px] text-slate/50">
                          {formatCurrency(homeSummary.monthProjectionInputs.pastNet)} + {formatCurrency(homeSummary.monthProjectionInputs.futureScheduledNet)} + ({formatCurrency(homeSummary.monthProjectionInputs.discretionaryDailyAvg)}/dia &times; {homeSummary.monthProjectionInputs.remainingDays} dias) = <span className="font-medium text-ink">{formatCurrency(homeSummary.monthProjectionNet.value)}</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Year-end projection */}
          {homeSummary.yearEndProjection && homeSummary.yearEndProjection.value !== 0 && (
            <Card className="bg-gradient-to-r from-violet-50/60 to-purple-50/60 backdrop-blur-xl border-violet-100/50">
              <CardContent className="py-3 lg:py-4 px-4 sm:px-6">
                <p className="text-[11px] lg:text-xs text-violet-600/70 font-medium mb-1">Se mantiver um ritmo parecido, o impacto acumulado até dezembro será de</p>
                <p className={`text-lg lg:text-2xl font-bold tabular-nums ${homeSummary.yearEndProjection.value >= 0 ? 'text-violet-700' : 'text-rose'}`}>
                  {formatCurrency(homeSummary.yearEndProjection.value)}
                </p>
                <p className="text-[10px] lg:text-[11px] text-slate/60 mt-1">{homeSummary.yearEndProjection.explanation}</p>

                {homeSummary.yearProjectionInputs && (
                  <>
                    <button
                      onClick={() => setYearExpanded(prev => !prev)}
                      className="flex items-center gap-1 mt-2 text-[10px] lg:text-[11px] text-violet-500/70 hover:text-violet-600 transition-colors"
                    >
                      <span>Ver por quê</span>
                      {yearExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>

                    <div className={cn(
                      'overflow-hidden transition-all duration-300 ease-in-out',
                      yearExpanded ? 'max-h-60 opacity-100 mt-3' : 'max-h-0 opacity-0 mt-0'
                    )}>
                      <div className="border-t border-violet-100/50 pt-3 space-y-1.5">
                        <div className="flex justify-between text-[11px] lg:text-xs">
                          <span className="text-slate/70">Projeção do mês atual</span>
                          <span className="font-medium text-ink tabular-nums">
                            {formatCurrency(homeSummary.yearProjectionInputs.projectedMonthNet)}
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px] lg:text-xs">
                          <span className="text-slate/70">Meses restantes até dezembro</span>
                          <span className="font-medium text-ink tabular-nums">
                            {homeSummary.yearProjectionInputs.monthsRemaining}
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px] lg:text-xs">
                          <span className="text-slate/70">Taxa conservadora usada</span>
                          <span className="font-medium text-ink tabular-nums">
                            {formatCurrency(homeSummary.yearProjectionInputs.conservativeRate)}/mês
                          </span>
                        </div>
                        {homeSummary.yearProjectionInputs.hasHistory && homeSummary.yearProjectionInputs.historicalAvg !== undefined && (
                          <div className="flex justify-between text-[11px] lg:text-xs">
                            <span className="text-slate/70">Média histórica</span>
                            <span className="font-medium text-ink tabular-nums">
                              {formatCurrency(homeSummary.yearProjectionInputs.historicalAvg)}/mês
                            </span>
                          </div>
                        )}
                        <div className="border-t border-violet-100/30 pt-2 mt-2 text-[10px] lg:text-[11px] text-slate/50">
                          Cálculo: {formatCurrency(homeSummary.yearProjectionInputs.conservativeRate)}/mês &times; {homeSummary.yearProjectionInputs.monthsRemaining} meses = <span className="font-medium text-ink">{formatCurrency(homeSummary.yearEndProjection.value)}</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Últimas transações (3–5) ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm lg:text-base font-semibold text-ink">{t('dashboard.recentTransactions')}</h2>
          <Link to="/transactions">
            <Button variant="ghost" size="sm" className="text-slate text-xs h-auto py-1">
              {t('dashboard.viewAll')}
              <ChevronRight size={14} className="ml-0.5" />
            </Button>
          </Link>
        </div>

        {homeSummary.latestTransactions.length === 0 ? (
          <Card className="bg-white/40 backdrop-blur-xl border-white/60">
            <CardContent className="py-8 text-center">
              <Landmark className="h-8 w-8 text-slate/40 mx-auto mb-2" />
              <p className="text-slate text-sm">{t('dashboard.noTransactions')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-1.5">
            {homeSummary.latestTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-2.5 sm:p-3 lg:p-4 rounded-xl bg-white/40 backdrop-blur border-white/60 gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className={`w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    transaction.type === 'income'
                      ? 'bg-emerald/10 text-emerald'
                      : transaction.type === 'transfer'
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-rose/10 text-rose'
                  }`}>
                    {transaction.type === 'income' ? (
                      <TrendingUp size={15} />
                    ) : transaction.type === 'transfer' ? (
                      <ArrowRightLeft size={15} />
                    ) : (
                      <TrendingDown size={15} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink text-sm lg:text-base leading-tight truncate">
                      {transaction.description}
                    </p>
                    <div className="flex items-center gap-1.5 text-[11px] lg:text-xs mt-0.5 text-slate">
                      <span>{transaction.category ? t(getTranslatedCategoryName(transaction.category.name)) : ''}</span>
                      {transaction.creditCard && (
                        <>
                          <span className="text-slate/30">·</span>
                          <span style={{ color: transaction.creditCard.color }}>{transaction.creditCard.name}</span>
                        </>
                      )}
                      {!transaction.creditCard && transaction.account && (
                        <>
                          <span className="text-slate/30">·</span>
                          {transaction.account.isCash ? (
                            <CashCurrencyIcon currency={transaction.account.currency} className="w-2.5 h-2.5 inline" style={{ color: transaction.account.color }} />
                          ) : transaction.toAccountId ? (
                            <ArrowRightLeft size={10} className="inline" />
                          ) : (
                            <Landmark size={10} className="inline" />
                          )}
                          <span style={{ color: transaction.account.color }}>{transaction.account.name}</span>
                          {transaction.type === 'transfer' && transaction.toAccount && (
                            <>
                              <span className="text-slate/30">→</span>
                              <span style={{ color: transaction.toAccount.color }}>{transaction.toAccount.name}</span>
                            </>
                          )}
                        </>
                      )}
                      {viewMode === 'family' && (transaction as any).isShared && (
                        <SharedDataBadge
                          ownerName={((transaction.account as any)?.ownerName || (transaction.creditCard as any)?.ownerName || '').split(' ')[0]}
                          photoURL={transaction.ownerUserId ? getMemberPhoto(transaction.ownerUserId) : undefined}
                          className="scale-75 origin-left"
                        />
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`font-bold tabular-nums text-sm lg:text-base whitespace-nowrap ${
                    transaction.type === 'income'
                      ? 'text-emerald'
                      : transaction.type === 'transfer'
                        ? 'text-blue-600'
                        : 'text-rose'
                  }`}>
                    {transaction.type === 'income' ? '+' : transaction.type === 'transfer' ? '' : '-'}
                    {formatCurrency(transaction.amount, accountCurrencyMap[transaction.accountId || ''] || 'BRL')}
                  </p>
                  <p className="text-[10px] lg:text-xs text-slate/60 mt-0.5">
                    {new Date(transaction.date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Quick links (informação que saiu da Home) ── */}
      <div className="grid grid-cols-3 gap-2 lg:gap-3 pt-1">
        <Link to="/accounts" className="flex flex-col items-center gap-1 p-3 lg:p-4 rounded-xl bg-white/30 hover:bg-white/50 transition-colors">
          <Landmark size={18} className="text-slate lg:hidden" />
          <Landmark size={22} className="text-slate hidden lg:block" />
          <span className="text-[11px] lg:text-sm text-slate font-medium">{t('nav.accounts')}</span>
        </Link>
        <Link to="/credit-cards" className="flex flex-col items-center gap-1 p-3 lg:p-4 rounded-xl bg-white/30 hover:bg-white/50 transition-colors">
          <CreditCardIcon size={18} className="text-slate lg:hidden" />
          <CreditCardIcon size={22} className="text-slate hidden lg:block" />
          <span className="text-[11px] lg:text-sm text-slate font-medium">{t('nav.creditCards')}</span>
        </Link>
        <Link to="/budgets" className="flex flex-col items-center gap-1 p-3 lg:p-4 rounded-xl bg-white/30 hover:bg-white/50 transition-colors">
          <TrendingUp size={18} className="text-slate lg:hidden" />
          <TrendingUp size={22} className="text-slate hidden lg:block" />
          <span className="text-[11px] lg:text-sm text-slate font-medium">{t('nav.budgets')}</span>
        </Link>
      </div>

    </div>
  );
}
