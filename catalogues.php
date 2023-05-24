<?php

$hCataloguesTpl = $this->loadTemplate($this->sPageDir . '/catalogues.html');
if (!$hCataloguesTpl) {
	return $this->errorResult("Ошибка загрузки шаблона 'catalogues.html'");
}

return [
	'status' => 'OK',
	//'no_title' => true,
	'content' => $hCataloguesTpl['catalogues'],
	'css_files' => [
		'catalogues.css'
	]
];
