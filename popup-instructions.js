const backgroundColor = '#00a1ff';
const color = 'white';
const fontSize = '21px';
const buttonBackground = '#f175ad';
const buttonColor = 'white';
const boxShadow = '5px 4px 20px rgba(0, 0, 0, 0.5)';
const buttonPushShadow = '0px 3px 5px rgba(0, 0, 0, 0.5)';

function continueButton() {
  const continueBtn = document.createElement('button');
  const continueBtnText = document.createTextNode('Continue');
  continueBtn.id = 'continueBtn';
  continueBtn.appendChild(continueBtnText);
  continueBtn.addEventListener('mousedown', (event) => {
    event.currentTarget.style.boxShadow = buttonPushShadow;
    event.currentTarget.style.transition = 'box-shadow ease-in-out 100ms';
    event.currentTarget.style.outline = 'none';
  });
  return continueBtn;
}

function create() {
  const instructionsText = document.createTextNode('Load any unloaded images then click');
  const instructions = document.createElement('div');
  const continueBtn = continueButton();
  instructions.id = 'extInstructions';
  instructions.appendChild(instructionsText);
  instructions.appendChild(continueBtn);

  // Instructions Container Styles
  instructions.style.position = 'fixed';
  instructions.style.top = '12%';
  instructions.style.left = '50%';
  instructions.style.transform = 'translateX(-50%)';
  instructions.style.backgroundColor = backgroundColor;
  instructions.style.color = color;
  instructions.style.fontSize = fontSize;
  instructions.style.textTransform = 'uppercase';
  instructions.style.fontFamily = 'helvetica';
  instructions.style.fontWeight = 'lighter';
  instructions.style.padding = '17px';
  instructions.style.borderWidth = '0px';
  instructions.style.borderRadius = '15px';
  instructions.style.zIndex = '10000';
  instructions.style.boxShadow = boxShadow;

  // Button Styles
  continueBtn.style.backgroundColor = buttonBackground;
  continueBtn.style.borderRadius = '28px';
  continueBtn.style.color = buttonColor;
  continueBtn.style.fontSize = fontSize;
  continueBtn.style.fontFamily = 'helvetica';
  continueBtn.style.fontWeight = 'lighter';
  continueBtn.style.textTransform = 'uppercase';
  continueBtn.style.padding = '10px';
  continueBtn.style.borderWidth = '0px';
  continueBtn.style.boxShadow = boxShadow;
  continueBtn.style.cursor = 'pointer';
  continueBtn.style.marginLeft = '10px';
  continueBtn.style.transition = 'box-shadow ease-in-out 100ms';

  document.body.appendChild(instructions);
}

create();
