function press(num){
    document.getElementById("display").value+=num;
}
function calculate()
{
    let expr=document.getElementById("display").value;
    document.getElementById("display").value=eval(expr);
}
function ClearDisplay()
{
    document.getElementById("display").value="";
}