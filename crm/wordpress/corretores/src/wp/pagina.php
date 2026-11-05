<?php
/**
 * Template Name: Área do corretor parceiro
 *
 * Cópia do modelo "Página informativa" (o do desenvolvedor do site, colado pelo
 * Felipe em 05/11/2026) só para a página /corretores/: o cadastro de parceiro do
 * CRM entra logo depois do topo, e a seção do formulário antigo sai. Os
 * blocos e a galeria continuam vindo dos campos da página, como antes.
 * Gerado por crm/wordpress/corretores/build.mjs; não edite o arquivo do tema à mão.
 */

defined( 'ABSPATH' ) || exit;

get_header();

while ( have_posts() ) :
	the_post();
	mb_page_hero_fields();

	$blocos  = mb_f( 'blocos', null, [] );
	$galeria = mb_f( 'galeria', null, [] );
	?>
<!-- mbp:cadastro -->

	<?php if ( $blocos ) : ?>
	<section>
		<div class="wrap">
			<?php mb_head( mb_cab( 'blocos_cab' ) ); ?>
			<div class="grid gap-5.5 md:grid-cols-2 lg:grid-cols-3">
				<?php foreach ( $blocos as $i => $b ) : ?>
					<?php mb_reveal_open( $i * 60 ); ?>
					<div class="rounded-[3px] border border-line bg-white p-7 transition-all hover:-translate-y-1 hover:shadow-elegant">
						<h3 class="mb-2.5 text-[1.12rem]"><?php echo esc_html( $b['titulo'] ); ?></h3>
						<p class="text-[0.92rem] text-ink-soft"><?php echo esc_html( $b['texto'] ); ?></p>
					</div>
					<?php mb_reveal_close(); ?>
				<?php endforeach; ?>
			</div>
		</div>
	</section>
	<?php endif; ?>

	<?php if ( $galeria ) : ?>
	<section class="border-y border-line bg-white">
		<div class="wrap">
			<?php mb_head( mb_cab( 'galeria_cab' ) ); ?>
			<?php mb_foto_grid( $galeria ); ?>
		</div>
	</section>
	<?php endif; ?>
	<?php
endwhile;

get_footer();
