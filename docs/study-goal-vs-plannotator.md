# Estudo comparativo: onde o `/goal` do stelow falha e como o Plannotator resolve

**Data:** 2026-10-26
**Status:** rascunho de estudo (não é proposta de mudança)

## O problema real

O `/goal` hoje produz um documento de objetivo. O que ele não faz é **garantir
que o objetivo foi revisado por um humano antes da execução começar**. Numa
sessão longa, um agente que escreve o próprio objetivo e depois o executa está
validando a própria premissa — e nenhum teste pega isso, porque o teste valida a
execução, não a pergunta que a originou.

O Plannotator existe para esse buraco: transformar um artefato que o agente
produziu num artefato que o humano **aprovou explicitamente**, com um registro
que sobrevive à sessão.

## O que cada um cobre hoje

| Capacidade | `/goal` | Plannotator |
|---|---|---|
| Estrutura a intenção em fases | sim | não se aplica |
| Entrevista o usuário | parcial | sim (`/plannotator-setup-goal`) |
| Produz fact sheet revisável | não | sim |
| Aprovação explícita com registro | **não** | sim |
| Sessão sobrevive à troca de contexto | não | sim |
| Rastreia execução por fase | sim | não se aplica |
| Verificação de conclusão por critério | sim | não |

Nenhum dos dois é completo. A pergunta deste estudo é qual lacuna importa mais.

## Onde o `/goal` falha — quatro modos concretos

### 1. Auto-validação da premissa

O agente escreve o objetivo e depois o executa. Nada entre os dois passos pede
ao humano "isto é o que você quer?". Em sessões longas, o objetivo escrito na
fase 1 é reafirmado na fase 5 pelo mesmo contexto que o escreveu, então um erro
de premissa não aparece como erro — aparece como consistência.

### 2. Fases sem evidência de aprovação

As fases existem, mas não há artefato que diga "esta fase foi aprovada em tal
data, por estas razões". Quando a execução desanda na fase 4, não há como saber
se a premissa da fase 1 foi aceita ou apenas assumida.

### 3. Contexto evapora

Compactação e troca de sessão apagam o porquê. O objetivo sobrevive como texto;
a conversa que o justificou não. O agente retoma com o enunciado e sem o
raciocínio, e tende a re-derivar uma versão simplificada dele.

### 4. Nenhum gate real

Como nada exige aprovação, "objetivo concluído" e "objetivo correto" colapsam na
mesma checagem. O `/goal` verifica que as fases rodaram, não que a pergunta
certa foi feita.

## Como o Plannotator resolve

O fluxo do `plannotator-setup-goal` transforma intenção em **pacote de objetivo**:

1. **Entrevista** — o humano responde perguntas estruturadas antes de qualquer
   plano existir.
2. **Fact sheet** — o que foi entendido vira um documento revisável, com fatos
   separados de suposições.
3. **Revisão no Plannotator** — o humano edita e aprova o fact sheet
   explicitamente, não "não objetou".
4. **Execução** — só então o plano é produzido, e ele referencia um artefato já
   aprovado.

A diferença de fundo é o **registro**: a aprovação é um artefato com data, não um
estado mental do humano naquela sessão.

## Proposta: `/goal` com gate do Plannotator

Três mudanças, em ordem de custo crescente:

### Mudança 1 — Fact sheet obrigatório antes das fases (barata)

Antes de gerar fases, o `/goal` produz um fact sheet no formato do Plannotator e
pede aprovação. Sem aprovação, não há fases. Isso fecha o modo de falha 1 com
uma etapa, sem infraestrutura nova.

### Mudança 2 — Cada fase referencia o fact sheet (média)

As fases passam a citar o item do fact sheet que as justifica. Quando a execução
diverge, a divergência fica visível como "esta fase não corresponde ao que foi
aprovado", em vez de virar reinterpretação silenciosa.

### Mudança 3 — Aprovação por fase no Plannotator (caro)

Cada fase vira uma revisão própria. Mais rigoroso, e mais lento — provavelmente
só para objetivos de alto risco.

## O que eu recomendaria

Começar pela **Mudança 1**. Ela resolve o modo de falha mais grave (auto-
validação da premissa) com uma etapa e sem dependência nova de infraestrutura. As
mudanças 2 e 3 só valem se a 1 mostrar que o gargalo real é a execução, e não a
premissa.

Vale também considerar a alternativa oposta: manter o `/goal` como está e usar o
Plannotator só nos objetivos que justificam o custo. Nem todo objetivo precisa de
um fact sheet aprovado — um refactor de rotina não precisa, uma mudança de
arquitetura precisa.

## Perguntas em aberto

1. O fact sheet aprovado deve ser por objetivo ou por sessão?
2. Quem aprova quando há mais de um humano no projeto?
3. O que acontece quando a execução descobre que o fact sheet estava errado —
   reabre a aprovação ou segue com a divergência registrada?
