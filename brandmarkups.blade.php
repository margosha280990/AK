@extends('backpack::layout')

@section('header')
    <section class="content-header">
      <h1>
        Наценки по брендам<small>список</small>
      </h1>
      <ol class="breadcrumb">
        <li><a href="{{ url(config('backpack.base.route_prefix', 'dashboard')) }}">Управление</a></li>
        <li><a href="{{ url(config('backpack.base.route_prefix', 'brandmarkups2')) }}">Наценки по брендам</a></li>
        <li class="active">{{ trans('backpack::crud.list') }}</li>
      </ol>
    </section>
@endsection


@section('content')
    <div class="row">
        <div class="col-md-12">
            <div class="box box-default">
                <div class="box-header with-border">
                    <div class="box-title">Обработка файлов</div>
                </div>

                <div class="box-body">
					{{$test}}
					
					<div>
						<p><b>Инструкция по загрузке файлов.</b></p>
						<p> 1. Открываем файл excel.</p>
						<p> 2. Выбираем вкладку "Разработчик"-> "Макросы".</p>
						<p> 3. Из раскрывшегося окна выбираем "Наценки по брендам".Нажимаем кнопку "Выполнить".</p>
						<p>  - Как только скрипт отработает, новый файл _brand_markups.txt будет сохранен там же, где и расположен файл эксель с наценками.</p>
						<p> 4. Переходим в форму "Загрузка файла и обработка файла", которая ниже. Нажимаем "Выбор файла"</p>
						<p> 5. Выбираем наш сохраненные файл _brand_markups.txt и нажимаем кнопку "Отправить"</p>
						<p> 6. Ждем когда нам выведется сообщение "Документ успешно загружен" (<b>Внимание! ожидание может занимать до минуты-две примерно</b>)</p>
					</div>
					<hr style="border: 1px solid #ccc;">
					<h4>Загрузка файла и обработка файла</h4>
					<form id="doc_form" method="post">
						{{ csrf_field() }}
						<input type="file" name="upload_f" id="upload_f">
						<input id="sendfile" type="submit">
					</form>
					<hr style="border: 1px solid #ccc;">
				
				</div>
            </div>
        </div>
    </div>	
@endsection

@section('after_scripts')
<script>
jQuery(document).ready(function($) { 



$('#doc_form').submit(function(event) {
    event.preventDefault();
    var formData = new FormData(this);
    $.ajax({
        async: true,
        url: '{{ Request::url() }}/test',
        headers: { 'X-CSRF-Token': $('meta[name="csrf-token"]').attr('content') },
        type: 'POST', 
        contentType: false,             
        data: formData,
        cache : false,
        processData: false,
        success: function(result)
        {
            var obj = JSON.parse(result);
			if (obj["success"] == true){
				alert(obj["mess"]);
				console.log(obj["mess"]);
			}
			else {
				alert(obj["err"]);
			}
        },
        error: function(data)
        {
            console.log(data);
			var obj = JSON.parse(data);
            alert(obj["err"]);
        }
    });
});




});
</script>

@endsection