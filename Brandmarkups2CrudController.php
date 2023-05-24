<?php

namespace App\Http\Controllers\Admin;
use Illuminate\Http\Request;
use Illuminate\Html\HtmlBuilder as html;
use Illuminate\Html\FormBuilder as form;
use Backpack\CRUD\app\Http\Controllers\CrudController;
use App\Models\Brands\Brand;
use App\Models\PartHierarchy;
use App\Models\Warehouses\Route;
// VALIDATION: change the requests to match your own file names if you need form validation
use App\Http\Requests\PagesRequest as StoreRequest;
use App\Http\Requests\PagesRequest as UpdateRequest;
use App\Http\Requests\PagesRequest as Requests;
use Illuminate\Support\Facades\DB;

use Illuminate\Support\Facades\Storage;
//use DB;

class Brandmarkups2CrudController extends CrudController
{
   public function index() {
		$whatever = '';
		return view('brandmarkups',['test' => $whatever]);
	}
	
	
	
	public function test(Request $request) {
	   $file = $request->file('upload_f');

       $completeFileName = $file->getClientOriginalName();
       $fileNameOnly = pathinfo($completeFileName, PATHINFO_FILENAME);
       $extension = $file->getClientOriginalExtension();
       $file->move("/mnt/slow1/sites/PROD/var/exchange/",$completeFileName);
		
		$dbconn = pg_connect(config('constants.tt'));
		
		$result = pg_query($dbconn, "call exchange.brand_markups_update('/mnt/slow1/sites/PROD/var/exchange/_brand_markups.txt')");
		
		
		
		$resp = array();
        $resp["success"] = true;
        $resp["mess"] = "Документ успешно загружен";


        return json_encode($resp);
       // return $file;
	}





	
}