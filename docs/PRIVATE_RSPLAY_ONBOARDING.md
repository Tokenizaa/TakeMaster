# Onboarding privado — RS Play TV

## Regra de negócio

O TakeMaster é uma plataforma privada da RS Play TV. Não existe onboarding aberto para criação de organizações.

Cada pessoa cria sua própria conta de usuário e, para utilizar um programa, precisa contratar o programa no catálogo oficial.

## Fluxo

1. Criar conta / autenticar.
2. Visualizar o catálogo de programas da RS Play TV.
3. Escolher o programa.
4. Contratar o programa.
5. A contratação ativa a assinatura e o acesso ao programa.
6. O usuário passa a atuar como representante daquele programa.

O mesmo usuário pode contratar e representar mais de um programa.

## Organização

A organização controlada pela plataforma é RS Play TV (`slug=rs-play-tv`).

O usuário não cria uma organização e não recebe owner automaticamente.

Ao contratar o primeiro programa, o backend associa o usuário à organização RS Play TV como member.

## Separação de conceitos

- `program_catalog`: catálogo oficial dos programas RS Play TV.
- `commercial_plans`: planos comerciais disponíveis.
- `organization_subscriptions`: contratação do plano para RS Play TV.
- `organization_programs`: programa operacional ativado.
- `program_user_access`: autorização individual do usuário para representar/operar o programa.

## Segurança

A autorização individual é baseada em `auth.uid()` e RLS. O usuário pode consultar somente seus próprios registros em `program_user_access`.

A criação de organização foi removida do fluxo de onboarding. A função antiga `bootstrap_organization` deixa de ser usada e é removida pela migration.

A função de contratação é SECURITY DEFINER em `tm_private`, valida `auth.uid()`, usa somente o tenant fixo `rs-play-tv` e não aceita `organization_id` fornecido pelo cliente.

## Observação sobre pagamento

A implementação atual trata o clique em Contratar como a confirmação da contratação e ativa o acesso. Integração com gateway de pagamento, cobrança recorrente ou aprovação financeira deve ser adicionada posteriormente sem alterar o modelo de identidade/acesso.
