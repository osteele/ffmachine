<?php
$name = $_REQUEST['name'];
$filename = 'saved/'.$name.'.txt';
write_text($filename, file_get_contents("php://input"));
header('Content-Type: text/plain');
echo 'written';

function write_text($filename, $data) {
	$f = @fopen($filename, 'w');
	if ($f) {
		$bytes = fwrite($f, $data);
		fclose($f);
		return $bytes;
	}

	return false;
}

?>
