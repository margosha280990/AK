<?php

namespace App\Http\Controllers\Admin;

use Backpack\CRUD\app\Http\Controllers\CrudController;
// VALIDATION: change the requests to match your own file names if you need form validation
use App\Http\Requests\ArticleRequest as StoreRequest;
use App\Http\Requests\ArticleRequest as UpdateRequest;

class ArticleCrudController extends CrudController
{
    public function __construct()
    {
        parent::__construct();
        /*
        |--------------------------------------------------------------------------
        | BASIC CRUD INFORMATION
        |--------------------------------------------------------------------------
        */
        $this->crud->setModel("\App\Models\Article");
        $this->crud->setRoute(config('backpack.base.route_prefix', 'admin').'/article');
        $this->crud->setEntityNameStrings('публикацию', 'публикации');

        /*
        |--------------------------------------------------------------------------
        | COLUMNS AND FIELDS
        |--------------------------------------------------------------------------
        */

        // ------ CRUD COLUMNS
		$this->crud->addColumn([
                                'name' => 'id',
                                'label' => 'ID',
                            ]);
        $this->crud->addColumn([
                                'name' => 'date',
                                'label' => 'Дата',
                                'type' => 'date',
                            ]);
        $this->crud->addColumn([
                                'name' => 'status',
                                'label' => 'Статус',
                            ]);
        $this->crud->addColumn([
                                'name' => 'title',
                                'label' => 'Заголовок',
                            ]);
        $this->crud->addColumn([
                                'name' => 'featured',
                                'label' => 'Особенная',
                                'type' => 'check',
                            ]);
        $this->crud->addColumn([
                                'label' => 'Категория',
                                'type' => 'select',
                                'name' => 'category_id',
                                'entity' => 'category',
                                'attribute' => 'name',
                                'model' => "\App\Models\Category",
                            ]);
        $this->crud->addColumn([
            'name' => 'start_at',
            'label' => 'Время начала',
            'type' => 'datetime',
        ]);
        $this->crud->addColumn([
            'name' => 'stop_at',
            'label' => 'Время окончания',
            'type' => 'datetime',
        ]);

        // ------ CRUD FIELDS
        $this->crud->addField([    // TEXT
                                'name' => 'title',
                                'label' => 'Заголовок',
                                'type' => 'text',
//                                'placeholder' => 'Your title here',
                            ]);
        $this->crud->addField([
                                'name' => 'slug',
                                'label' => 'SEO url',
                                'type' => 'text',
                                'hint' => 'Будет автоматически создан из заголовка, если оставите пустым.',
                                // 'disabled' => 'disabled'
                            ]);

        $this->crud->addField([    // TEXT
                                'name' => 'date',
                                'label' => 'Дата',
                                'type' => 'date',
                                'value' => date('Y-m-d'),
                            ], 'create');
        $this->crud->addField([    // TEXT
                                'name' => 'date',
                                'label' => 'Дата',
                                'type' => 'date',
                            ], 'update');

        $this->crud->addField(
            [
                'name' => 'start_at',
                'label' => 'Время начала',
                'type' => 'datetime',
                'format' => 'DD.MM.YYYY HH:mm'
            ]
        );
        $this->crud->addField(
            [
                'name' => 'stop_at',
                'label' => 'Время окончания',
                'type' => 'datetime',
                'format' => 'DD.MM.YYYY HH:mm'
            ]
        );

        $this->crud->addField([    // WYSIWYG
                                'name' => 'preview',
                                'label' => 'Краткое содержание',
                                'type' => 'ckeditor',
                                'placeholder' => 'Your textarea text here',
                            ]);
        $this->crud->addField([    // WYSIWYG
                                'name' => 'content',
                                'label' => 'Содержание',
                                'type' => 'ckeditor',
                                'placeholder' => 'Your textarea text here',
                            ]);
        $this->crud->addField([    // Image
                                'name' => 'image',
                                'label' => 'Иллюстрация',
                                'type' => 'browse',
                            ]);
        $this->crud->addField([    // SELECT
                                'label' => 'Категория',
                                'type' => 'select2',
                                'name' => 'category_id',
                                'entity' => 'category',
                                'attribute' => 'name',
                                'model' => "\App\Models\Category",
                            ]);
        $this->crud->addField([       // Select2Multiple = n-n relationship (with pivot table)
                                'label' => 'Метки',
                                'type' => 'select2_multiple',
                                'name' => 'tags', // the method that defines the relationship in your Model
                                'entity' => 'tags', // the method that defines the relationship in your Model
                                'attribute' => 'name', // foreign key attribute that is shown to user
                                'model' => "\App\Models\Tag", // foreign key model
                                'pivot' => true, // on create&update, do you need to add/delete pivot table entries?
                            ]);
        $this->crud->addField([    // ENUM
                                'name' => 'status',
                                'label' => 'Статус',
                                'type' => 'enum',
                            ]);
        $this->crud->addField([    // CHECKBOX
                                'name' => 'featured',
                                'label' => 'Особенная публикация',
                                'type' => 'checkbox',
                            ]);
		$this->crud->addField([    // CHECKBOX
                                'name' => 'participation',
                                'label' => 'Подтверждение участия в акции',
                                'type' => 'checkbox',
                            ]);

       // $this->crud->enableAjaxTable();
    }

    public function store(StoreRequest $request)
    {
        return parent::storeCrud();
    }

    public function update(UpdateRequest $request)
    {
        return parent::updateCrud();
    }
}
